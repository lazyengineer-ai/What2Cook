import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { mealPlanSchema } from "@/lib/validations";
import { recipeViolatesConstraint } from "@/lib/dietary";
import { getWeekStart, addDays, parseDateOnly } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { searchParams } = new URL(req.url);
  const weekStartParam = searchParams.get("weekStart");

  const weekStart = weekStartParam
    ? parseDateOnly(weekStartParam)
    : getWeekStart();

  const weekEnd = addDays(weekStart, 6);

  const entries = await prisma.mealPlanEntry.findMany({
    where: {
      householdId: user.householdId,
      date: { gte: weekStart, lte: weekEnd },
    },
    include: {
      recipe: {
        include: {
          recipeIngredients: {
            include: { ingredient: { include: { category: true } } },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { mealSlot: "asc" }],
  });

  return NextResponse.json({ weekStart, entries });
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const parsed = mealPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { date, mealSlot, recipeId } = parsed.data;
  const planDate = parseDateOnly(date);
  const dayOfWeek = planDate.getDay();

  const [recipe, constraints] = await Promise.all([
    prisma.recipe.findFirst({
      where: { id: recipeId, householdId: user.householdId },
      include: {
        recipeIngredients: {
          include: { ingredient: { include: { category: true } } },
        },
      },
    }),
    prisma.dietaryConstraint.findMany({
      where: { householdId: user.householdId, dayOfWeek },
    }),
  ]);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const violation = recipeViolatesConstraint(
    recipe,
    constraints.map((c) => c.rule)
  );

  const entry = await prisma.mealPlanEntry.upsert({
    where: {
      householdId_date_mealSlot: {
        householdId: user.householdId,
        date: planDate,
        mealSlot,
      },
    },
    update: { recipeId },
    create: {
      householdId: user.householdId,
      date: planDate,
      mealSlot,
      recipeId,
    },
    include: { recipe: true },
  });

  return NextResponse.json({ entry, warning: violation }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await prisma.mealPlanEntry.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mealPlanEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
