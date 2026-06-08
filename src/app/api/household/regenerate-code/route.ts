import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserApi, requireOwner } from "@/lib/auth-utils";
import { generateUniqueInviteCode } from "@/lib/household-code";

export async function POST() {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const owner = await requireOwner(user.id, user.householdId);
  if (!owner) {
    return NextResponse.json(
      { error: "Only the household owner can regenerate the join code" },
      { status: 403 }
    );
  }

  try {
    const inviteCode = await generateUniqueInviteCode(async (code) => {
      const existing = await prisma.household.findUnique({
        where: { inviteCode: code },
      });
      return !!existing;
    });

    const household = await prisma.household.update({
      where: { id: user.householdId },
      data: { inviteCode },
    });

    return NextResponse.json({ inviteCode: household.inviteCode });
  } catch {
    return NextResponse.json(
      { error: "Failed to regenerate join code" },
      { status: 500 }
    );
  }
}
