//whoami endpoint to confirm auth is working

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const session = await auth();
  return NextResponse.json(session);
}
