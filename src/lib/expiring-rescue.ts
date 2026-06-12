import type { MatchResult } from "@/lib/match-recipes";

export interface RescueRecipe extends MatchResult {
  rescueScore: number;
}

/**
 * Rank recipes that use expiring pantry ingredients by urgency and cookability.
 */
export function rankRescueRecipes(
  matches: MatchResult[],
  _expiringNames: string[]
): RescueRecipe[] {
  const withExpiring = matches.filter((m) => m.expiringIngredients.length > 0);

  const ranked: RescueRecipe[] = withExpiring.map((m) => ({
    ...m,
    rescueScore: m.expiringIngredients.length * 10 + m.matchScore / 10,
  }));

  return ranked.sort((a, b) => b.rescueScore - a.rescueScore).slice(0, 5);
}
