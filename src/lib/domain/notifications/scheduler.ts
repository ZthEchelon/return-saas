import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Generic notification job scheduler helpers shared by immediate + digest paths.
// Dedupe keys should be deterministic per (user, event) so reruns stay idempotent.

export type ScheduleJobParams = {
	userId: string;
	dedupeKey: string;
	channel: "EMAIL_DIGEST" | "EMAIL_IMMEDIATE";
	sendAt: Date;
	notificationId?: string | null;
	status?: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELED";
};

export async function upsertNotificationJob(params: ScheduleJobParams) {
	const {
		userId,
		dedupeKey,
		channel,
		sendAt,
		notificationId = null,
		status = "PENDING",
	} = params;

	const existing = await prisma.notificationJob.findUnique({
		where: { userId_dedupeKey: { userId, dedupeKey } },
	});

	if (existing) {
		return prisma.notificationJob.update({
			where: { id: existing.id },
			data: {
				channel,
				sendAt,
				notificationId,
				status,
				lockedAt: null,
				lockId: null,
				lastError: null,
			},
		});
	}

	return prisma.notificationJob.create({
		data: {
			userId,
			dedupeKey,
			channel,
			sendAt,
			notificationId,
			status,
		},
	});
}

export async function scheduleImmediateNotification(params: {
	userId: string;
	eventKey: string;
	notificationId: string;
	sendAt?: Date;
}) {
	const { userId, eventKey, notificationId, sendAt = new Date() } = params;
	const dedupeKey = `${eventKey}:immediate`;

	return upsertNotificationJob({
		userId,
		dedupeKey,
		channel: "EMAIL_IMMEDIATE",
		sendAt,
		notificationId,
		status: "PENDING",
	});
}

export async function scheduleDigestForEventDay(params: {
	userId: string;
	eventKey: string;
	localDate: string; // YYYY-MM-DD in user TZ
	sendAt: Date; // UTC send time for that local day
	notificationId?: string | null;
}) {
	const { userId, eventKey, localDate, sendAt, notificationId = null } = params;
	const dedupeKey = `${eventKey}:digest:${localDate}`;

	return upsertNotificationJob({
		userId,
		dedupeKey,
		channel: "EMAIL_DIGEST",
		sendAt,
		notificationId,
		status: "PENDING",
	});
}

export async function cancelJobsForEvent(params: {
	userId: string;
	dedupeKey?: string;
	dedupeKeyStartsWith?: string;
}) {
	const { userId, dedupeKey, dedupeKeyStartsWith } = params;

	const where: any = {
		userId,
		status: { in: ["PENDING", "SENDING"] },
	};
	if (dedupeKey) where.dedupeKey = dedupeKey;
	if (dedupeKeyStartsWith) where.dedupeKey = { startsWith: dedupeKeyStartsWith };

	await prisma.notificationJob.updateMany({
		where,
		data: { status: "CANCELED", lockedAt: null, lockId: null },
	});
}

export async function claimDueJobs(params: {
	channel: "EMAIL_DIGEST" | "EMAIL_IMMEDIATE";
	limit?: number;
	lockTimeoutMinutes?: number;
}) {
	const { channel, limit = 25, lockTimeoutMinutes = 10 } = params;
	const lockId = crypto.randomUUID();

	const jobs = await prisma.$queryRaw<any[]>`
		WITH picked AS (
			SELECT id
			FROM "NotificationJob"
			WHERE status = 'PENDING'
				AND channel = ${channel}
				AND "sendAt" <= NOW()
				AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '${lockTimeoutMinutes} minutes')
			ORDER BY "sendAt" ASC
			LIMIT ${limit}
			FOR UPDATE SKIP LOCKED
		)
		UPDATE "NotificationJob" j
		SET status = 'SENDING',
				"lockedAt" = NOW(),
				"lockId" = ${lockId},
				attempts = attempts + 1
		FROM picked
		WHERE j.id = picked.id
		RETURNING j.*;
	`;

	return { lockId, jobs };
}

export function nextRetrySendAt(now: Date, attempts: number) {
	const minutes = [5, 30, 120, 720, 1440][Math.min(Math.max(attempts - 1, 0), 4)];
	return new Date(now.getTime() + minutes * 60_000);
}

