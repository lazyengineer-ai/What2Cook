import type { PantryItemWithIngredient } from "@/lib/match-recipes";

export interface AggregatedPantryItem {
  ingredientId: string;
  quantity: number;
  unit: string;
  hasExpiringBatch: boolean;
  batches: PantryItemWithIngredient[];
}

export function sortBatchesFEFO(
  batches: PantryItemWithIngredient[]
): PantryItemWithIngredient[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate && b.expiryDate) {
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    }
    if (a.expiryDate && !b.expiryDate) return -1;
    if (!a.expiryDate && b.expiryDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function aggregatePantryByIngredient(
  items: PantryItemWithIngredient[],
  expiringWithinDays = 3
): Map<string, AggregatedPantryItem> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + expiringWithinDays);

  const map = new Map<string, AggregatedPantryItem>();

  for (const item of items) {
    const existing = map.get(item.ingredientId);
    const isExpiring =
      !!item.expiryDate && new Date(item.expiryDate) <= cutoff;

    if (existing) {
      existing.quantity += item.quantity;
      existing.batches.push(item);
      if (isExpiring) existing.hasExpiringBatch = true;
    } else {
      map.set(item.ingredientId, {
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        hasExpiringBatch: isExpiring,
        batches: [item],
      });
    }
  }

  return map;
}

export interface IngredientBatchGroup {
  ingredientId: string;
  name: string;
  category: PantryItemWithIngredient["ingredient"]["category"];
  totalQuantity: number;
  unit: string;
  batches: PantryItemWithIngredient[];
}

export function groupBatchesByIngredient(
  items: PantryItemWithIngredient[]
): IngredientBatchGroup[] {
  const byIngredient = new Map<string, IngredientBatchGroup>();

  for (const item of items) {
    const existing = byIngredient.get(item.ingredientId);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.batches.push(item);
    } else {
      byIngredient.set(item.ingredientId, {
        ingredientId: item.ingredientId,
        name: item.ingredient.name,
        category: item.ingredient.category,
        totalQuantity: item.quantity,
        unit: item.unit,
        batches: [item],
      });
    }
  }

  return Array.from(byIngredient.values()).map((group) => ({
    ...group,
    batches: sortBatchesFEFO(group.batches),
  }));
}

export function groupBatchesByCategoryThenIngredient(
  items: PantryItemWithIngredient[]
): Map<string, IngredientBatchGroup[]> {
  const ingredientGroups = groupBatchesByIngredient(items);
  const byCategory = new Map<string, IngredientBatchGroup[]>();

  for (const group of ingredientGroups) {
    const key = group.category.name;
    const list = byCategory.get(key) ?? [];
    list.push(group);
    byCategory.set(key, list);
  }

  return byCategory;
}
