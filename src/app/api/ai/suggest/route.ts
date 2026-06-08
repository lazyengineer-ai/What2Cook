import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { scoreAllRecipes } from "@/lib/match-recipes";
import { filterRecipesByConstraints } from "@/lib/dietary";

export async function POST(req: Request) {
  const user = await requireUser();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI suggestions not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const targetDate = body.date ? new Date(body.date) : new Date();
  const dayOfWeek = targetDate.getDay();

  const [pantry, recipes, constraints, recentMeals] = await Promise.all([
    prisma.pantryItem.findMany({
      where: { householdId: user.householdId, quantity: { gt: 0 } },
      include: { ingredient: { include: { category: true } } },
    }),
    prisma.recipe.findMany({
      where: { householdId: user.householdId },
      include: {
        recipeIngredients: {
          include: { ingredient: { include: { category: true } } },
        },
      },
    }),
    prisma.dietaryConstraint.findMany({
      where: { householdId: user.householdId, dayOfWeek },
    }),
    prisma.mealPlanEntry.findMany({
      where: { householdId: user.householdId },
      include: { recipe: true },
      orderBy: { date: "desc" },
      take: 7,
    }),
  ]);

  const rules = constraints.map((c) => c.rule);
  const filteredRecipes = filterRecipesByConstraints(recipes, rules);
  const matches = scoreAllRecipes(filteredRecipes, pantry);

  const pantryList = pantry
    .map((p) => `${p.ingredient.name} (${p.quantity} ${p.unit})`)
    .join(", ");

  const recentList = recentMeals.map((m) => m.recipe.title).join(", ");
  const topMatches = matches.slice(0, 5).map((m) => m.title).join(", ");
  const constraintText =
    rules.length > 0 ? rules.join(", ") : "none";

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful home cooking assistant. Suggest 2-3 meal ideas based on available pantry items and dietary constraints. Be concise. Format as JSON array with objects: { "title", "reason", "missingIngredients": string[] }`,
      },
      {
        role: "user",
        content: `Pantry: ${pantryList || "empty"}
Dietary constraints today: ${constraintText}
Recent meals (avoid repeating): ${recentList || "none"}
Best matching saved recipes: ${topMatches || "none"}
Suggest meals I can make today.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let suggestions;
  try {
    const parsed = JSON.parse(content);
    suggestions = parsed.suggestions ?? parsed.meals ?? parsed;
  } catch {
    suggestions = [{ title: "Could not parse", reason: content, missingIngredients: [] }];
  }

  return NextResponse.json({ suggestions, pantryCount: pantry.length });
}
