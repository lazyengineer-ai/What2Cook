import { z } from "zod";

// ---------------------------------------------------------------------------
// Feature 3 — Meal Suggestions (/api/ai/suggest)
// ---------------------------------------------------------------------------

export const suggestInputSchema = z.object({
  date: z.string().datetime().optional(),
  preferences: z.string().max(300).optional(),
});

export const suggestionSchema = z.object({
  title: z.string(),
  reason: z.string(),
  missingIngredients: z.array(z.string()).default([]),
  matchedRecipeId: z.string().optional(),
  source: z.enum(["ai", "saved"]),
});

export const suggestOutputSchema = z.object({
  suggestions: z.array(suggestionSchema),
  pantryCount: z.number().int(),
});

export type SuggestInput = z.infer<typeof suggestInputSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type SuggestOutput = z.infer<typeof suggestOutputSchema>;

/** Shape the LLM is asked to produce (before merging with saved matches). */
export const llmSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      missingIngredients: z.array(z.string()).default([]),
    })
  ),
});

// ---------------------------------------------------------------------------
// Feature 2 / A — Recipe drafts (/api/ai/recipe-draft, suggestion-to-recipe)
// ---------------------------------------------------------------------------

export const recipeDraftInputSchema = z.object({
  prompt: z.string().min(3).max(1000),
  servings: z.number().int().min(1).max(20).optional(),
  preferences: z.string().max(300).optional(),
});

export const recipeDraftIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  isOptional: z.boolean().default(false),
});

/** Raw LLM output for a recipe draft (ingredient names, not ids). */
export const recipeDraftLlmSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  prepTime: z.number().int().min(0).nullable().default(null),
  servings: z.number().int().min(1).default(4),
  ingredients: z.array(recipeDraftIngredientSchema).min(1),
});

/** Draft after ingredient resolution — matches RecipeFormInitialData. */
export const recipeDraftOutputSchema = z.object({
  draft: z.object({
    title: z.string(),
    instructions: z.string(),
    prepTime: z.number().int().nullable(),
    servings: z.number().int(),
    photoUrl: z.string().nullable(),
    ingredients: z.array(
      z.object({
        ingredientId: z.string(),
        name: z.string(),
        quantity: z.number(),
        unit: z.string(),
        isOptional: z.boolean(),
      })
    ),
  }),
  unresolvedIngredients: z.array(
    z.object({ name: z.string(), reason: z.string() })
  ),
});

export type RecipeDraftInput = z.infer<typeof recipeDraftInputSchema>;
export type RecipeDraftLlm = z.infer<typeof recipeDraftLlmSchema>;
export type RecipeDraftOutput = z.infer<typeof recipeDraftOutputSchema>;

// ---------------------------------------------------------------------------
// Feature A — Suggestion-to-meal-plan
// ---------------------------------------------------------------------------

export const suggestionToMealPlanInputSchema = z.object({
  title: z.string().min(1),
  reason: z.string().default(""),
  missingIngredients: z.array(z.string()).default([]),
  date: z.string(),
  mealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  preferences: z.string().max(300).optional(),
});

export type SuggestionToMealPlanInput = z.infer<
  typeof suggestionToMealPlanInputSchema
>;

// ---------------------------------------------------------------------------
// Feature 1 — Pantry Agent (/api/ai/pantry/*)
// ---------------------------------------------------------------------------

export const pantryIntentSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    expiryDate: z.string().optional(),
  }),
  z.object({
    action: z.literal("remove"),
    name: z.string().min(1),
    quantity: z.number().positive().optional(),
  }),
  z.object({
    action: z.literal("update"),
    name: z.string().min(1),
    quantity: z.number().min(0),
    unit: z.string().optional(),
    expiryDate: z.string().optional(),
  }),
]);

export const pantryParseInputSchema = z.object({
  text: z.string().min(2).max(1000),
});

/** LLM output wrapper for pantry parsing. */
export const pantryIntentsLlmSchema = z.object({
  intents: z.array(pantryIntentSchema),
});

/** Intent after ingredient resolution — ready for preview + confirm. */
export const resolvedPantryIntentSchema = z.object({
  action: z.enum(["add", "remove", "update"]),
  ingredientName: z.string(),
  ingredientId: z.string().nullable(),
  willCreate: z.boolean(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  expiryDate: z.string().nullable(),
  existingPantryItemId: z.string().nullable(),
});

export const pantryConfirmInputSchema = z.object({
  intents: z.array(resolvedPantryIntentSchema).min(1),
  expense: z
    .object({
      store: z.string().optional(),
      date: z.string(),
      total: z.number().positive(),
      receiptUrl: z.string().nullable().optional(),
    })
    .optional(),
});

export type PantryIntent = z.infer<typeof pantryIntentSchema>;
export type ResolvedPantryIntent = z.infer<typeof resolvedPantryIntentSchema>;
export type PantryConfirmInput = z.infer<typeof pantryConfirmInputSchema>;

// ---------------------------------------------------------------------------
// Feature 1c — Receipt parsing
// ---------------------------------------------------------------------------

export const receiptParseInputSchema = z.object({
  imageUrl: z.string().url(),
});

/** LLM vision output for a receipt. */
export const receiptParseLlmSchema = z.object({
  intents: z.array(pantryIntentSchema),
  store: z.string().nullable().default(null),
  total: z.number().nullable().default(null),
  date: z.string().nullable().default(null),
});

export type ReceiptParseInput = z.infer<typeof receiptParseInputSchema>;
export type ReceiptParseLlm = z.infer<typeof receiptParseLlmSchema>;
