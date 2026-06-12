import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { rankRescueRecipes } from "@/lib/expiring-rescue";
import { scoreAllRecipes } from "@/lib/match-recipes";
import { getExpiringItems } from "@/lib/usage-forecast";

export async function GET() {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const [recipes, pantry, expiring] = await Promise.all([
    prisma.recipe.findMany({
      where: { householdId: user.householdId },
      include: {
        recipeIngredients: {
          include: { ingredient: { include: { category: true } } },
        },
      },
    }),
    prisma.pantryItem.findMany({
      where: { householdId: user.householdId },
      include: {
        ingredient: { include: { category: true } },
      },
    }),
    getExpiringItems(user.householdId),
  ]);

  const matches = scoreAllRecipes(recipes, pantry);
  const expiringNames = expiring.map((item) => item.ingredient.name);

  return NextResponse.json({
    cookNow: matches.filter((m) => m.matchScore === 100),
    almostThere: matches.filter((m) => m.matchScore >= 70 && m.matchScore < 100),
    useExpiring: matches.filter((m) => m.expiringIngredients.length > 0),
    all: matches,
    rescue: {
      expiringItems: expiring.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: item.expiryDate!.toISOString(),
        ingredient: {
          name: item.ingredient.name,
          category: { icon: item.ingredient.category.icon },
        },
      })),
      rankedRecipes: rankRescueRecipes(matches, expiringNames),
    },
  });
}
