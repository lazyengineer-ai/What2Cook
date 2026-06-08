import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { generateGroceryNeeds, groupByCategory } from "@/lib/grocery-generator";
import { getWeekStart, addDays } from "@/lib/utils";

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const weekStartParam = searchParams.get("weekStart");

  const weekStart = weekStartParam
    ? new Date(weekStartParam)
    : getWeekStart();

  const list = await prisma.groceryList.findFirst({
    where: {
      householdId: user.householdId,
      weekStartDate: weekStart,
    },
    include: {
      items: {
        include: { ingredient: { include: { category: true } } },
        orderBy: { ingredient: { name: "asc" } },
      },
    },
  });

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const weekStart = body.weekStart
    ? new Date(body.weekStart)
    : getWeekStart();
  const weekEnd = addDays(weekStart, 6);

  const [mealEntries, pantry, staples] = await Promise.all([
    prisma.mealPlanEntry.findMany({
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
    }),
    prisma.pantryItem.findMany({
      where: { householdId: user.householdId },
      include: { ingredient: { include: { category: true } } },
    }),
    prisma.recurringStaple.findMany({
      where: { householdId: user.householdId },
      include: { ingredient: { include: { category: true } } },
    }),
  ]);

  const recipes = mealEntries.map((e) => e.recipe);
  const needs = generateGroceryNeeds(recipes, pantry);

  for (const staple of staples) {
    const inPantry = pantry.find((p) => p.ingredientId === staple.ingredientId);
    const inNeeds = needs.find((n) => n.ingredientId === staple.ingredientId);
    const pantryQty = inPantry?.quantity ?? 0;

    if (pantryQty < staple.quantity) {
      const deficit = staple.quantity - pantryQty;
      if (inNeeds) {
        inNeeds.totalQuantity = Math.max(inNeeds.totalQuantity, deficit);
      } else {
        needs.push({
          ingredientId: staple.ingredientId,
          name: staple.ingredient.name,
          unit: staple.unit,
          categoryName: staple.ingredient.category.name,
          categorySlug: staple.ingredient.category.slug,
          totalQuantity: deficit,
        });
      }
    }
  }

  const grouped = groupByCategory(needs);

  let groceryList = await prisma.groceryList.findFirst({
    where: { householdId: user.householdId, weekStartDate: weekStart },
  });

  if (groceryList) {
    await prisma.groceryListItem.deleteMany({
      where: { groceryListId: groceryList.id, source: "AUTO_GENERATED" },
    });
  } else {
    groceryList = await prisma.groceryList.create({
      data: {
        householdId: user.householdId,
        weekStartDate: weekStart,
        status: "ACTIVE",
      },
    });
  }

  for (const need of needs) {
    await prisma.groceryListItem.upsert({
      where: {
        groceryListId_ingredientId: {
          groceryListId: groceryList.id,
          ingredientId: need.ingredientId,
        },
      },
      update: {
        quantity: need.totalQuantity,
        unit: need.unit,
        source: "AUTO_GENERATED",
      },
      create: {
        groceryListId: groceryList.id,
        ingredientId: need.ingredientId,
        quantity: need.totalQuantity,
        unit: need.unit,
        source: "AUTO_GENERATED",
      },
    });
  }

  const fullList = await prisma.groceryList.findUnique({
    where: { id: groceryList.id },
    include: {
      items: {
        include: { ingredient: { include: { category: true } } },
      },
    },
  });

  return NextResponse.json({ list: fullList, grouped }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const { itemId, checked } = body;

  const item = await prisma.groceryListItem.findFirst({
    where: { id: itemId },
    include: { groceryList: true },
  });

  if (!item || item.groceryList.householdId !== user.householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.groceryListItem.update({
    where: { id: itemId },
    data: { checked },
    include: { ingredient: { include: { category: true } } },
  });

  return NextResponse.json(updated);
}
