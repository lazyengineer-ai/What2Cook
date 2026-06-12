import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { assertIngredientAccessible } from "@/lib/ingredient-access";
import { prisma } from "@/lib/db";
import { expandToRecipeDraft } from "@/lib/ai/recipe-expansion";
import { suggestionToMealPlanInputSchema } from "@/lib/ai/schemas";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import { recipeViolatesConstraint } from "@/lib/dietary";
import { estimateCostCents, isAiConfigured } from "@/lib/openai";
import { formatDateOnly, parseDateOnly } from "@/lib/utils";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = suggestionToMealPlanInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "RECIPE_DRAFT");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  const { title, reason, date, mealSlot, preferences } = parsed.data;
  const planDate = parseDateOnly(date);
  const dayOfWeek = planDate.getDay();

  try {
    const { draft, usage } = await expandToRecipeDraft(
      user.householdId,
      `${title}\n${reason}`,
      { preferences }
    );

    await logUsage(user.householdId, "RECIPE_DRAFT", {
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      estimatedCostCents: estimateCostCents(usage.tokensIn, usage.tokensOut),
    });

    if (draft.ingredients.length === 0) {
      return NextResponse.json(
        { error: "Could not resolve any ingredients" },
        { status: 422 }
      );
    }

    for (const ing of draft.ingredients) {
      if (!(await assertIngredientAccessible(user.householdId, ing.ingredientId))) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        householdId: user.householdId,
        title: draft.title,
        instructions: draft.instructions,
        prepTime: draft.prepTime,
        servings: draft.servings,
        photoUrl: null,
        recipeIngredients: {
          create: draft.ingredients.map((ing) => ({
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

    const constraints = await prisma.dietaryConstraint.findMany({
      where: { householdId: user.householdId, dayOfWeek },
    });

    const violation = recipeViolatesConstraint(
      recipe,
      constraints.map((c) => c.rule)
    );

    const entry = await prisma.mealPlanEntry.upsert({
      where: {
        householdId_date_mealSlot: {
          householdId: user.householdId,
          date: planDate,
          mealSlot,
        },
      },
      update: { recipeId: recipe.id },
      create: {
        householdId: user.householdId,
        date: planDate,
        mealSlot,
        recipeId: recipe.id,
      },
      include: { recipe: true },
    });

    return NextResponse.json(
      {
        recipe,
        entry: { ...entry, date: formatDateOnly(entry.date) },
        warning: violation,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to add suggestion to meal plan" },
      { status: 500 }
    );
  }
}
