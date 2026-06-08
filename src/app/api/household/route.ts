import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserApi } from "@/lib/auth-utils";
import { createHouseholdSchema } from "@/lib/validations";
import { generateUniqueInviteCode } from "@/lib/household-code";

export async function GET() {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const memberships = await prisma.householdMember.findMany({
    where: { userId: user.id },
    include: { household: true },
    orderBy: { joinedAt: "asc" },
  });

  const activeMembership = memberships.find(
    (m) => m.householdId === user.householdId
  );

  const members = await prisma.householdMember.findMany({
    where: { householdId: user.householdId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const isOwner = activeMembership?.role === "OWNER";

  return NextResponse.json({
    activeHouseholdId: user.householdId,
    memberships: memberships.map((m) => ({
      householdId: m.householdId,
      name: m.household.name,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    members: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    inviteCode: isOwner
      ? memberships.find((m) => m.householdId === user.householdId)?.household
          .inviteCode
      : null,
    isOwner,
  });
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const parsed = createHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const inviteCode = await generateUniqueInviteCode(async (code) => {
      const existing = await prisma.household.findUnique({
        where: { inviteCode: code },
      });
      return !!existing;
    });

    const household = await prisma.$transaction(async (tx) => {
      const created = await tx.household.create({
        data: { name: parsed.data.name, inviteCode },
      });

      await tx.householdMember.create({
        data: {
          userId: user.id,
          householdId: created.id,
          role: "OWNER",
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { activeHouseholdId: created.id },
      });

      return created;
    });

    return NextResponse.json(
      { id: household.id, name: household.name, inviteCode: household.inviteCode },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to create household" }, { status: 500 });
  }
}
