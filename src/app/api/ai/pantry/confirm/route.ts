import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { assertIngredientAccessible } from "@/lib/ingredient-access";
import { prisma } from "@/lib/db";
import { pantryConfirmInputSchema } from "@/lib/ai/schemas";
import { resolveIngredientName } from "@/lib/ai/ingredient-resolver";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = pantryConfirmInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { intents, expense } = parsed.data;
  const skipped: string[] = [];
  let applied = 0;

  await prisma.$transaction(async (tx) => {
    for (const intent of intents) {
      if (intent.action === "add") {
        let ingredientId = intent.ingredientId;
        if (!ingredientId) {
          const created = await resolveIngredientName(
            user.householdId,
            intent.ingredientName,
            { createIfMissing: true }
          );
          ingredientId = created?.id ?? null;
        }
        if (!ingredientId || intent.quantity == null || !intent.unit) {
          skipped.push(intent.ingredientName);
          continue;
        }
        if (!(await assertIngredientAccessible(user.householdId, ingredientId))) {
          skipped.push(intent.ingredientName);
          continue;
        }
        await tx.pantryItem.create({
          data: {
            householdId: user.householdId,
            ingredientId,
            quantity: intent.quantity,
            unit: intent.unit,
            expiryDate: intent.expiryDate ? new Date(intent.expiryDate) : null,
            purchasedAt: new Date(),
          },
        });
        applied++;
        continue;
      }

      if (!intent.existingPantryItemId) {
        skipped.push(intent.ingredientName);
        continue;
      }

      const existing = await tx.pantryItem.findFirst({
        where: { id: intent.existingPantryItemId, householdId: user.householdId },
      });
      if (!existing) {
        skipped.push(intent.ingredientName);
        continue;
      }

      if (intent.action === "update") {
        if (intent.quantity == null) {
          skipped.push(intent.ingredientName);
          continue;
        }
        await tx.pantryItem.update({
          where: { id: existing.id },
          data: {
            quantity: intent.quantity,
            ...(intent.unit ? { unit: intent.unit } : {}),
            ...(intent.expiryDate !== undefined && {
              expiryDate: intent.expiryDate ? new Date(intent.expiryDate) : null,
            }),
            lastUpdated: new Date(),
          },
        });
        applied++;
        continue;
      }

      if (intent.action === "remove") {
        const removeQty = intent.quantity;
        if (removeQty == null || removeQty >= existing.quantity) {
          await tx.pantryItem.delete({ where: { id: existing.id } });
        } else {
          await tx.pantryItem.update({
            where: { id: existing.id },
            data: {
              quantity: existing.quantity - removeQty,
              lastUpdated: new Date(),
            },
          });
        }
        applied++;
      }
    }

    if (expense) {
      await tx.purchaseRecord.create({
        data: {
          householdId: user.householdId,
          store: expense.store,
          date: new Date(expense.date),
          total: expense.total,
          receiptUrl: expense.receiptUrl ?? null,
          lineItems: {
            create: intents
              .filter((i) => i.action === "add")
              .map((i) => ({
                description: i.ingredientName,
                amount: 0,
                ingredientId: i.ingredientId,
                quantity: i.quantity,
                unit: i.unit,
              })),
          },
        },
      });
    }
  });

  return NextResponse.json({ applied, skipped });
}
