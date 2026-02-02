import { NextResponse } from "next/server";
import { generateAuditCase } from "@/app/actions";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const forceNew = searchParams.get("force") === "1";
  const auditCase = await generateAuditCase(sessionId, { forceNew });
  return NextResponse.json(auditCase);
}
