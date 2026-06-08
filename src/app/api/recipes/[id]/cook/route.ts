import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { sortBatchesFEFO } from "@/lib/pantry-batches";

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

      const batches = await tx.pantryItem.findMany({
        where: {
          householdId: user.householdId,
          ingredientId: ri.ingredientId,
          quantity: { gt: 0 },
        },
        include: { ingredient: { include: { category: true } } },
      });

      let remaining = ri.quantity;
      for (const batch of sortBatchesFEFO(batches)) {
        if (remaining <= 0) break;

        const deduct = Math.min(batch.quantity, remaining);
        const newQty = batch.quantity - deduct;
        remaining -= deduct;

        if (newQty <= 0) {
          await tx.pantryItem.delete({ where: { id: batch.id } });
        } else {
          await tx.pantryItem.update({
            where: { id: batch.id },
            data: { quantity: newQty, lastUpdated: new Date() },
          });
        }
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
