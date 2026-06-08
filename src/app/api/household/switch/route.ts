import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUserApi, requireMembership } from "@/lib/auth-utils";
import { switchHouseholdSchema } from "@/lib/validations";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  try {
    const body = await req.json();
    const parsed = switchHouseholdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const membership = await requireMembership(user.id, parsed.data.householdId);
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this household" },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { activeHouseholdId: parsed.data.householdId },
    });

    const household = await prisma.household.findUniqueOrThrow({
      where: { id: parsed.data.householdId },
    });

    return NextResponse.json({
      householdId: household.id,
      name: household.name,
    });
  } catch {
    return NextResponse.json({ error: "Failed to switch household" }, { status: 500 });
  }
}
