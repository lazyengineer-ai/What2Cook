import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeInviteCode } from "@/lib/household-code";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const household = await prisma.household.findUnique({
    where: { inviteCode: normalizeInviteCode(code) },
    select: { name: true },
  });

  if (!household) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  return NextResponse.json({ householdName: household.name });
}
