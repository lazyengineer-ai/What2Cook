import { prisma } from "@/lib/db";
import { recipeDraftLlmSchema, type RecipeDraftOutput } from "@/lib/ai/schemas";
import { RECIPE_DRAFT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { resolveIngredientName } from "@/lib/ai/ingredient-resolver";
import { getOpenAI, MODEL_TEXT } from "@/lib/openai";

export async function expandToRecipeDraft(
  householdId: string,
  prompt: string,
  opts: { servings?: number; preferences?: string } = {}
): Promise<{
  draft: RecipeDraftOutput["draft"];
  unresolved: { name: string; reason: string }[];
  usage: { tokensIn: number; tokensOut: number };
}> {
  const pantryItems = await prisma.pantryItem.findMany({
    where: { householdId, quantity: { gt: 0 } },
    include: { ingredient: true },
    take: 40,
  });
  const pantryNames = pantryItems.map((p) => p.ingredient.name).join(", ");

  const completion = await getOpenAI().chat.completions.create({
    model: MODEL_TEXT,
    messages: [
      { role: "system", content: RECIPE_DRAFT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Pantry items available: ${pantryNames || "none"}
${opts.servings ? `Target servings: ${opts.servings}` : ""}
${opts.preferences ? `Preferences: ${opts.preferences}` : ""}
Create a recipe for: ${prompt}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const tokensIn = completion.usage?.prompt_tokens ?? 0;
  const tokensOut = completion.usage?.completion_tokens ?? 0;
  const content = completion.choices[0]?.message?.content ?? "{}";
  const llmParsed = recipeDraftLlmSchema.parse(JSON.parse(content));

  const ingredients: RecipeDraftOutput["draft"]["ingredients"] = [];
  const unresolved: { name: string; reason: string }[] = [];

  for (const ing of llmParsed.ingredients) {
    const resolved = await resolveIngredientName(householdId, ing.name, {
      createIfMissing: true,
    });
    if (!resolved) {
      unresolved.push({ name: ing.name, reason: "Could not match or create ingredient" });
      continue;
    }
    ingredients.push({
      ingredientId: resolved.id,
      name: resolved.name,
      quantity: ing.quantity,
      unit: ing.unit,
      isOptional: ing.isOptional,
    });
  }

  return {
    draft: {
      title: llmParsed.title,
      instructions: llmParsed.instructions,
      prepTime: llmParsed.prepTime,
      servings: opts.servings ?? llmParsed.servings,
      photoUrl: null,
      ingredients,
    },
    unresolved,
    usage: { tokensIn, tokensOut },
  };
}
