import type { RecipeWithIngredients, PantryItemWithIngredient } from "@/lib/match-recipes";

interface PlannedNeed {
  ingredientId: string;
  name: string;
  unit: string;
  categoryName: string;
  categorySlug: string;
  totalQuantity: number;
}

export function generateGroceryNeeds(
  recipes: RecipeWithIngredients[],
  pantry: PantryItemWithIngredient[],
  servingsMultiplier: Record<string, number> = {}
): PlannedNeed[] {
  const needsMap = new Map<string, PlannedNeed>();

  for (const recipe of recipes) {
    const multiplier = servingsMultiplier[recipe.id] ?? 1;
    for (const ri of recipe.recipeIngredients) {
      const qty = ri.quantity * multiplier;
      const existing = needsMap.get(ri.ingredientId);
      if (existing) {
        existing.totalQuantity += qty;
      } else {
        needsMap.set(ri.ingredientId, {
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          unit: ri.unit,
          categoryName: ri.ingredient.category.name,
          categorySlug: ri.ingredient.category.slug,
          totalQuantity: qty,
        });
      }
    }
  }

  const pantryMap = new Map<string, number>();
  for (const p of pantry) {
    pantryMap.set(p.ingredientId, (pantryMap.get(p.ingredientId) ?? 0) + p.quantity);
  }
  const toBuy: PlannedNeed[] = [];

  for (const need of needsMap.values()) {
    const inPantry = pantryMap.get(need.ingredientId) ?? 0;
    const deficit = need.totalQuantity - inPantry;
    if (deficit > 0) {
      toBuy.push({ ...need, totalQuantity: Math.ceil(deficit * 100) / 100 });
    }
  }

  return toBuy.sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name)
  );
}

export function groupByCategory<T extends { categoryName: string; categorySlug: string }>(
  items: T[]
): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = item.categorySlug;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
