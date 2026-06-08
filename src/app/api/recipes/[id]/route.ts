import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { recipeSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { id } = await params;

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.recipe.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.isFavorite !== undefined && Object.keys(body).length === 1) {
    const recipe = await prisma.recipe.update({
      where: { id },
      data: { isFavorite: body.isFavorite },
    });
    return NextResponse.json(recipe);
  }

  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { title, instructions, prepTime, servings, photoUrl, tags, ingredients } =
    parsed.data;

  const recipe = await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    return tx.recipe.update({
      where: { id },
      data: {
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
  });

  return NextResponse.json(recipe);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;
  const { id } = await params;

  const existing = await prisma.recipe.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
