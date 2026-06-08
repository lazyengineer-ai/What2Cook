import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { scoreAllRecipes } from "@/lib/match-recipes";

export async function GET() {
  const user = await requireUser();

  const [recipes, pantry] = await Promise.all([
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
  ]);

  const matches = scoreAllRecipes(recipes, pantry);

  return NextResponse.json({
    cookNow: matches.filter((m) => m.matchScore === 100),
    almostThere: matches.filter((m) => m.matchScore >= 70 && m.matchScore < 100),
    useExpiring: matches.filter((m) => m.expiringIngredients.length > 0),
    all: matches,
  });
}
