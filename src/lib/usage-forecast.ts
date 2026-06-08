import { prisma } from "@/lib/db";
import { subWeeks } from "date-fns";

export interface UsageForecast {
  ingredientId: string;
  name: string;
  unit: string;
  categoryName: string;
  avgWeeklyUsage: number;
  currentStock: number;
  weeksRemaining: number | null;
  suggestedBuy: number;
  isLowStock: boolean;
}

export async function getUsageForecasts(
  householdId: string,
  weeks = 8
): Promise<UsageForecast[]> {
  const since = subWeeks(new Date(), weeks);

  const [usageLogs, pantryItems] = await Promise.all([
    prisma.usageLog.findMany({
      where: { householdId, loggedAt: { gte: since } },
      include: { ingredient: { include: { category: true } } },
    }),
    prisma.pantryItem.findMany({
      where: { householdId },
      include: { ingredient: { include: { category: true } } },
    }),
  ]);

  const usageByIngredient = new Map<string, number>();
  for (const log of usageLogs) {
    const current = usageByIngredient.get(log.ingredientId) ?? 0;
    usageByIngredient.set(log.ingredientId, current + log.quantity);
  }

  const forecasts: UsageForecast[] = [];

  for (const item of pantryItems) {
    const totalUsed = usageByIngredient.get(item.ingredientId) ?? 0;
    const avgWeeklyUsage = totalUsed / weeks;
    const weeksRemaining =
      avgWeeklyUsage > 0 ? item.quantity / avgWeeklyUsage : null;
    const suggestedBuy =
      avgWeeklyUsage > 0
        ? Math.max(0, Math.ceil((avgWeeklyUsage * 2 - item.quantity) * 100) / 100)
        : 0;
    const threshold = item.lowStockThreshold ?? avgWeeklyUsage * 0.5;
    const isLowStock =
      item.quantity <= threshold ||
      (weeksRemaining !== null && weeksRemaining < 1);

    forecasts.push({
      ingredientId: item.ingredientId,
      name: item.ingredient.name,
      unit: item.unit,
      categoryName: item.ingredient.category.name,
      avgWeeklyUsage: Math.round(avgWeeklyUsage * 100) / 100,
      currentStock: item.quantity,
      weeksRemaining:
        weeksRemaining !== null
          ? Math.round(weeksRemaining * 10) / 10
          : null,
      suggestedBuy,
      isLowStock,
    });
  }

  return forecasts.sort((a, b) => {
    if (a.isLowStock && !b.isLowStock) return -1;
    if (!a.isLowStock && b.isLowStock) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getExpiringItems(householdId: string, withinDays = 3) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + withinDays);

  return prisma.pantryItem.findMany({
    where: {
      householdId,
      expiryDate: { lte: deadline, not: null },
      quantity: { gt: 0 },
    },
    include: {
      ingredient: { include: { category: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
}
