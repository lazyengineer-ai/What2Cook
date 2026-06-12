import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import {
  llmSuggestionsSchema,
  suggestInputSchema,
  type Suggestion,
} from "@/lib/ai/schemas";
import { SUGGEST_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import {
  estimateCostCents,
  getOpenAI,
  isAiConfigured,
  MODEL_TEXT,
} from "@/lib/openai";
import { filterRecipesByConstraints } from "@/lib/dietary";
import { scoreAllRecipes } from "@/lib/match-recipes";

function buildSavedSuggestions(
  matches: ReturnType<typeof scoreAllRecipes>
): Suggestion[] {
  const cookNow = matches.filter((m) => m.matchScore === 100).slice(0, 3);
  const expiring = matches
    .filter((m) => m.expiringIngredients.length > 0 && m.matchScore < 100)
    .slice(0, 2);

  const seen = new Set<string>();
  const saved: Suggestion[] = [];

  for (const m of [...cookNow, ...expiring]) {
    if (seen.has(m.recipeId)) continue;
    seen.add(m.recipeId);

    const reason =
      m.matchScore === 100
        ? `You have all ${m.requiredCount} ingredients in stock.`
        : `Uses expiring: ${m.expiringIngredients.join(", ")}.`;

    saved.push({
      title: m.title,
      reason,
      missingIngredients: m.missingIngredients.map((i) => i.name),
      matchedRecipeId: m.recipeId,
      source: "saved",
    });
  }

  return saved;
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = suggestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "SUGGEST");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  const targetDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
  const dayOfWeek = targetDate.getDay();
  const preferences = parsed.data.preferences?.trim();

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
  const savedSuggestions = buildSavedSuggestions(matches);

  const pantryList = pantry
    .map((p) => `${p.ingredient.name} (${p.quantity} ${p.unit})`)
    .join(", ");
  const recentList = recentMeals.map((m) => m.recipe.title).join(", ");
  const savedTitles = savedSuggestions.map((s) => s.title).join(", ");
  const constraintText = rules.length > 0 ? rules.join(", ") : "none";

  const recipeTitleById = new Map(recipes.map((r) => [r.title.toLowerCase(), r.id]));
  let aiSuggestions: Suggestion[] = [];
  let warning: string | undefined;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: SUGGEST_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Pantry: ${pantryList || "empty"}
Dietary constraints today: ${constraintText}
Recent meals (avoid repeating): ${recentList || "none"}
Already suggesting these saved recipes (do not duplicate): ${savedTitles || "none"}
${preferences ? `User preferences: ${preferences}` : ""}
Suggest creative meals I can make today.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const tokensIn = completion.usage?.prompt_tokens ?? 0;
    const tokensOut = completion.usage?.completion_tokens ?? 0;
    await logUsage(user.householdId, "SUGGEST", {
      tokensIn,
      tokensOut,
      estimatedCostCents: estimateCostCents(tokensIn, tokensOut),
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const llmParsed = llmSuggestionsSchema.safeParse(JSON.parse(content));
    if (llmParsed.success) {
      aiSuggestions = llmParsed.data.suggestions.map((s) => {
        const matchedRecipeId = recipeTitleById.get(s.title.toLowerCase());
        return {
          ...s,
          source: "ai" as const,
          matchedRecipeId,
        };
      });
    }
  } catch {
    warning = "AI suggestions unavailable; showing saved matches only.";
  }

  return NextResponse.json({
    suggestions: [...savedSuggestions, ...aiSuggestions],
    pantryCount: pantry.length,
    ...(warning ? { warning } : {}),
  });
}
