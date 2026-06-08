import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { groceryItemSchema } from "@/lib/validations";
import { getWeekStart } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = groceryItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { weekStart, ingredientId, quantity, unit } = parsed.data;
  const weekStartDate = weekStart ? new Date(weekStart) : getWeekStart();

  const ingredient = await prisma.ingredient.findFirst({
    where: {
      id: ingredientId,
      OR: [{ householdId: null }, { householdId: user.householdId }],
    },
  });

  if (!ingredient) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  let groceryList = await prisma.groceryList.findFirst({
    where: {
      householdId: user.householdId,
      weekStartDate,
    },
  });

  if (!groceryList) {
    groceryList = await prisma.groceryList.create({
      data: {
        householdId: user.householdId,
        weekStartDate,
        status: "ACTIVE",
      },
    });
  }

  const existing = await prisma.groceryListItem.findUnique({
    where: {
      groceryListId_ingredientId: {
        groceryListId: groceryList.id,
        ingredientId,
      },
    },
  });

  const item = existing
    ? await prisma.groceryListItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          unit,
        },
        include: { ingredient: { include: { category: true } } },
      })
    : await prisma.groceryListItem.create({
        data: {
          groceryListId: groceryList.id,
          ingredientId,
          quantity,
          unit,
          source: "MANUAL",
          checked: false,
        },
        include: { ingredient: { include: { category: true } } },
      });

  return NextResponse.json(item, { status: 201 });
}
