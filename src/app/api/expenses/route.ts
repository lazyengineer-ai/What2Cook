import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { purchaseSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUser();

  const purchases = await prisma.purchaseRecord.findMany({
    where: { householdId: user.householdId },
    include: {
      lineItems: {
        include: { ingredient: { include: { category: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  const byCategory = purchases.reduce(
    (acc, p) => {
      for (const li of p.lineItems) {
        const cat = li.ingredient?.category.name ?? "Other";
        acc[cat] = (acc[cat] ?? 0) + li.amount;
      }
      if (p.lineItems.length === 0) {
        acc["Uncategorized"] = (acc["Uncategorized"] ?? 0) + p.total;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const totalSpent = purchases.reduce((sum, p) => sum + p.total, 0);

  return NextResponse.json({ purchases, byCategory, totalSpent });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = purchaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { store, date, total, receiptUrl, notes, lineItems } = parsed.data;

  const purchase = await prisma.purchaseRecord.create({
    data: {
      householdId: user.householdId,
      store,
      date: new Date(date),
      total,
      receiptUrl,
      notes,
      lineItems: lineItems?.length
        ? {
            create: lineItems.map((li) => ({
              description: li.description,
              amount: li.amount,
              ingredientId: li.ingredientId,
              quantity: li.quantity,
              unit: li.unit,
            })),
          }
        : undefined,
    },
    include: {
      lineItems: { include: { ingredient: { include: { category: true } } } },
    },
  });

  return NextResponse.json(purchase, { status: 201 });
}
