import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id, householdId: user.householdId },
    include: { recipeIngredients: true },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    for (const ri of recipe.recipeIngredients) {
      if (ri.isOptional) continue;

      const pantryItem = await tx.pantryItem.findUnique({
        where: {
          householdId_ingredientId: {
            householdId: user.householdId,
            ingredientId: ri.ingredientId,
          },
        },
      });

      if (pantryItem) {
        const newQty = Math.max(0, pantryItem.quantity - ri.quantity);
        await tx.pantryItem.update({
          where: { id: pantryItem.id },
          data: { quantity: newQty, lastUpdated: new Date() },
        });
      }

      await tx.usageLog.create({
        data: {
          householdId: user.householdId,
          ingredientId: ri.ingredientId,
          recipeId: recipe.id,
          quantity: ri.quantity,
          unit: ri.unit,
        },
      });
    }

    await tx.recipe.update({
      where: { id },
      data: {
        lastCookedAt: new Date(),
        cookCount: { increment: 1 },
      },
    });
  });

  return NextResponse.json({ success: true });
}
