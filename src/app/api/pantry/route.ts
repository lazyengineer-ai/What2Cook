import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { assertIngredientAccessible } from "@/lib/ingredient-access";
import { prisma } from "@/lib/db";
import { pantryItemSchema } from "@/lib/validations";

export async function GET() {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const items = await prisma.pantryItem.findMany({
    where: { householdId: user.householdId },
    include: {
      ingredient: { include: { category: true } },
    },
    orderBy: [
      { ingredient: { name: "asc" } },
      { expiryDate: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const parsed = pantryItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { ingredientId, quantity, unit, expiryDate, photoUrl, lowStockThreshold } =
    parsed.data;

  if (!(await assertIngredientAccessible(user.householdId, ingredientId))) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  const item = await prisma.pantryItem.create({
    data: {
      householdId: user.householdId,
      ingredientId,
      quantity,
      unit,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      photoUrl,
      lowStockThreshold,
      purchasedAt: new Date(),
    },
    include: { ingredient: { include: { category: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
