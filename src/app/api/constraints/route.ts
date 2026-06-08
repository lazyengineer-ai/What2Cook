import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { dietaryConstraintSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUser();
  const constraints = await prisma.dietaryConstraint.findMany({
    where: { householdId: user.householdId },
    orderBy: [{ dayOfWeek: "asc" }, { rule: "asc" }],
  });
  return NextResponse.json(constraints);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = dietaryConstraintSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const constraint = await prisma.dietaryConstraint.upsert({
    where: {
      householdId_dayOfWeek_rule: {
        householdId: user.householdId,
        dayOfWeek: parsed.data.dayOfWeek,
        rule: parsed.data.rule,
      },
    },
    update: {},
    create: {
      householdId: user.householdId,
      ...parsed.data,
    },
  });

  return NextResponse.json(constraint, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.dietaryConstraint.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.dietaryConstraint.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
