import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId");

  const ingredients = await prisma.ingredient.findMany({
    where: {
      AND: [
        {
          OR: [{ householdId: null }, { householdId: user.householdId }],
        },
        q
          ? { name: { contains: q, mode: "insensitive" } }
          : {},
        categoryId ? { categoryId } : {},
      ],
    },
    include: { category: true },
    orderBy: { name: "asc" },
    take: 50,
  });

  return NextResponse.json(ingredients);
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const { name, categoryId, defaultUnit, photoUrl } = body;

  if (!name || !categoryId) {
    return NextResponse.json({ error: "Name and category required" }, { status: 400 });
  }

  const existing = await prisma.ingredient.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [{ householdId: null }, { householdId: user.householdId }],
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      categoryId,
      defaultUnit: defaultUnit ?? "pieces",
      photoUrl,
      householdId: user.householdId,
    },
    include: { category: true },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
