import { prisma } from "@/lib/db";
import { resolveIngredientName } from "@/lib/ai/ingredient-resolver";
import type { PantryIntent, ResolvedPantryIntent } from "@/lib/ai/schemas";

export async function resolvePantryIntents(
  householdId: string,
  intents: PantryIntent[]
): Promise<ResolvedPantryIntent[]> {
  const resolved: ResolvedPantryIntent[] = [];

  for (const intent of intents) {
    if (intent.action === "add") {
      const match = await resolveIngredientName(householdId, intent.name);
      resolved.push({
        action: "add",
        ingredientName: intent.name,
        ingredientId: match?.id ?? null,
        willCreate: !match,
        quantity: intent.quantity,
        unit: match?.defaultUnit ?? intent.unit,
        expiryDate: intent.expiryDate ?? null,
        existingPantryItemId: null,
      });
      continue;
    }

    const match = await resolveIngredientName(householdId, intent.name);
    let existingPantryItemId: string | null = null;
    if (match) {
      const item = await prisma.pantryItem.findFirst({
        where: { householdId, ingredientId: match.id },
        orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
      });
      existingPantryItemId = item?.id ?? null;
    }

    resolved.push({
      action: intent.action,
      ingredientName: intent.name,
      ingredientId: match?.id ?? null,
      willCreate: false,
      quantity:
        intent.action === "remove"
          ? (intent.quantity ?? null)
          : intent.quantity,
      unit: intent.action === "update" ? (intent.unit ?? match?.defaultUnit ?? null) : null,
      expiryDate: intent.action === "update" ? (intent.expiryDate ?? null) : null,
      existingPantryItemId,
    });
  }

  return resolved;
}

export function summarizePantryIntents(intents: ResolvedPantryIntent[]): string {
  const counts = { add: 0, remove: 0, update: 0 };
  for (const i of intents) counts[i.action]++;
  const parts: string[] = [];
  if (counts.add) parts.push(`Add ${counts.add}`);
  if (counts.update) parts.push(`Update ${counts.update}`);
  if (counts.remove) parts.push(`Remove ${counts.remove}`);
  return parts.join(" · ") || "No changes";
}

export function isAllowedReceiptUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "utfs.io" ||
      parsed.hostname.endsWith(".uploadthing.com") ||
      parsed.hostname === "uploadthing.com"
    );
  } catch {
    return false;
  }
}
