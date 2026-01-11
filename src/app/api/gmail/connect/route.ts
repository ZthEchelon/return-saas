//oauth routes 

//start connect

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { oauthClient } from "@/lib/gmailClient";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const oauth2 = oauthClient();

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });

  return NextResponse.redirect(url);
}
