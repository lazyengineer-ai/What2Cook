import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { recipeSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, householdId: user.householdId },
      include: {
        recipeIngredients: {
          include: { ingredient: { include: { category: true } } },
        },
      },
    });
    if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(recipe);
  }

  const recipes = await prisma.recipe.findMany({
    where: { householdId: user.householdId },
    include: {
      recipeIngredients: {
        include: { ingredient: { include: { category: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const body = await req.json();
  const parsed = recipeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { title, instructions, prepTime, servings, photoUrl, tags, ingredients } =
    parsed.data;

  const recipe = await prisma.recipe.create({
    data: {
      householdId: user.householdId,
      title,
      instructions,
      prepTime,
      servings,
      photoUrl,
      tags,
      recipeIngredients: {
        create: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional,
        })),
      },
    },
    include: {
      recipeIngredients: {
        include: { ingredient: { include: { category: true } } },
      },
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
