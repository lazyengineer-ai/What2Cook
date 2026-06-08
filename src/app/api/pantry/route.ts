import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { pantryItemSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUser();

  const items = await prisma.pantryItem.findMany({
    where: { householdId: user.householdId },
    include: {
      ingredient: { include: { category: true } },
    },
    orderBy: { ingredient: { name: "asc" } },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = pantryItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { ingredientId, quantity, unit, expiryDate, photoUrl, lowStockThreshold } =
    parsed.data;

  const item = await prisma.pantryItem.upsert({
    where: {
      householdId_ingredientId: {
        householdId: user.householdId,
        ingredientId,
      },
    },
    update: {
      quantity,
      unit,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      photoUrl,
      lowStockThreshold,
      lastUpdated: new Date(),
    },
    create: {
      householdId: user.householdId,
      ingredientId,
      quantity,
      unit,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      photoUrl,
      lowStockThreshold,
    },
    include: { ingredient: { include: { category: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
