import { NextResponse } from "next/server";
import {
  generateCase,
  generateRectificationOptions,
} from "@/app/actions";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const includeOptions = searchParams.get("options") === "1";
  const forceNew = searchParams.get("force") === "1";

  const caseData = await generateCase(sessionId, { forceNew });
  if (!includeOptions) {
    return NextResponse.json(caseData);
  }

  const rectificationOptions = await generateRectificationOptions(
    caseData,
    sessionId
  );

  return NextResponse.json({ caseData, rectificationOptions });
}
