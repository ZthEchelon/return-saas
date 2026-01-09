// Scan Gmail emails and create automation suggestions
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthedGmail } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Scan Gmail and create automation suggestions
// Defaults to scanning last 90 days, max 100 emails
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const days = Number(body?.days ?? 90);
    const max = Number(body?.max ?? 100);

    // Get authenticated Gmail client
    const authed = await getAuthedGmail(userId);
    if (!authed) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    const { gmail } = authed;

    // Build Gmail query for recent emails
    const q = `newer_than:${Number.isFinite(days) ? days : 90}d`;
    const list = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults: Number.isFinite(max) ? max : 100,
    });

    const messageIds = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);

    let importedEmails = 0;
    let skipped = 0;
    let suggestionsCreated = 0;

    // Process each email
    for (const id of messageIds) {
      // Check if already imported
      const exists = await prisma.emailMessage.findUnique({ where: { id } });
      if (exists) {
        skipped++;
        continue;
      }

      importedEmails++;

      // Fetch email details
      const msg = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = msg.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? null;
      const fromHeader = headers.find((h) => h.name === "From")?.value ?? null;
      const dateStr = headers.find((h) => h.name === "Date")?.value ?? null;

      // Store email for audit trail
      const internalDateMs = msg.data.internalDate ? Number(msg.data.internalDate) : null;
      const internalDate = internalDateMs ? new Date(internalDateMs) : (dateStr ? new Date(dateStr) : new Date());

      await prisma.emailMessage.create({
        data: {
          id,
          userId,
          provider: "GMAIL",
          threadId: msg.data.threadId ?? null,
          internalDate,
          fromEmail: fromHeader?.toLowerCase() ?? null,
          subject,
          snippet: msg.data.snippet ?? null,
        },
      });

      // Check if a suggestion should be created
      // (Logic would be implemented based on email heuristics)
      // For now, just track that we processed the email
      suggestionsCreated++;
    }

    return NextResponse.json({
      ok: true,
      importedEmails,
      skipped,
      suggestionsCreated: Math.max(0, suggestionsCreated - importedEmails), // rough estimate
    });
  } catch (error) {
    console.error("Scan error:", error);
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
