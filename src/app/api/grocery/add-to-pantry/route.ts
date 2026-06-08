import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const weekStart = body.weekStart ? parseDateOnly(body.weekStart) : null;

  if (!weekStart) {
    return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
  }

  const groceryList = await prisma.groceryList.findFirst({
    where: {
      householdId: user.householdId,
      weekStartDate: weekStart,
    },
    include: {
      items: {
        where: { checked: true },
        include: { ingredient: true },
      },
    },
  });

  if (!groceryList || groceryList.items.length === 0) {
    return NextResponse.json(
      { error: "No checked items to add", added: 0 },
      { status: 400 }
    );
  }

  const added: string[] = [];

  for (const item of groceryList.items) {
    await prisma.pantryItem.upsert({
      where: {
        householdId_ingredientId: {
          householdId: user.householdId,
          ingredientId: item.ingredientId,
        },
      },
      update: {
        quantity: { increment: item.quantity },
        unit: item.unit,
        lastUpdated: new Date(),
      },
      create: {
        householdId: user.householdId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
      },
    });
    added.push(item.ingredient.name);
    await prisma.groceryListItem.delete({ where: { id: item.id } });
  }

  return NextResponse.json({ added: added.length, items: added });
}
