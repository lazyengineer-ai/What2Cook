import { prisma } from "@/lib/db";

export async function assertIngredientAccessible(
  householdId: string,
  ingredientId: string
): Promise<boolean> {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: { householdId: true },
  });

  if (!ingredient) return false;
  return ingredient.householdId === null || ingredient.householdId === householdId;
}
