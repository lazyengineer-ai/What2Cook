import { prisma } from "@/lib/db";

export interface ResolvedIngredient {
  id: string;
  name: string;
  defaultUnit: string;
  created: boolean;
}

/**
 * Map a human ingredient name (from LLM output) to a DB ingredient id.
 * Deterministic — no LLM calls. The ONLY place fuzzy ingredient matching
 * lives; features must import this rather than reimplementing.
 *
 * Resolution order:
 *  1. Exact case-insensitive match (global catalog or this household)
 *  2. Fuzzy `contains` match, shortest name wins
 *  3. Optionally create a household ingredient (category: "Other" fallback)
 */
export async function resolveIngredientName(
  householdId: string,
  name: string,
  opts: { createIfMissing?: boolean } = {}
): Promise<ResolvedIngredient | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const scope = { OR: [{ householdId: null }, { householdId }] };

  const exact = await prisma.ingredient.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, ...scope },
  });
  if (exact) {
    return {
      id: exact.id,
      name: exact.name,
      defaultUnit: exact.defaultUnit,
      created: false,
    };
  }

  const fuzzy = await prisma.ingredient.findMany({
    where: { name: { contains: trimmed, mode: "insensitive" }, ...scope },
    take: 5,
  });
  if (fuzzy.length > 0) {
    // Shortest name is the closest match ("Milk" over "Buttermilk Powder")
    const best = fuzzy.reduce((a, b) => (a.name.length <= b.name.length ? a : b));
    return {
      id: best.id,
      name: best.name,
      defaultUnit: best.defaultUnit,
      created: false,
    };
  }

  if (!opts.createIfMissing) return null;

  const category =
    (await prisma.ingredientCategory.findUnique({ where: { slug: "other" } })) ??
    (await prisma.ingredientCategory.findFirst({ orderBy: { sortOrder: "asc" } }));
  if (!category) return null;

  const created = await prisma.ingredient.create({
    data: {
      name: titleCase(trimmed),
      categoryId: category.id,
      defaultUnit: "pieces",
      householdId,
    },
  });

  return {
    id: created.id,
    name: created.name,
    defaultUnit: created.defaultUnit,
    created: true,
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
