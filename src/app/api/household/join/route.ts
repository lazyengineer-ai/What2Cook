import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserApi } from "@/lib/auth-utils";
import { joinHouseholdSchema } from "@/lib/validations";
import { normalizeInviteCode } from "@/lib/household-code";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const parsed = joinHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const inviteCode = normalizeInviteCode(parsed.data.inviteCode);
    const household = await prisma.household.findUnique({
      where: { inviteCode },
    });

    if (!household) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 400 });
    }

    const existing = await prisma.householdMember.findUnique({
      where: {
        userId_householdId: { userId: user.id, householdId: household.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You are already in this household" },
        { status: 400 }
      );
    }

    await prisma.householdMember.create({
      data: {
        userId: user.id,
        householdId: household.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({
      householdId: household.id,
      name: household.name,
    });
  } catch {
    return NextResponse.json({ error: "Failed to join household" }, { status: 500 });
  }
}
