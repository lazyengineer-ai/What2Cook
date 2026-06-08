import { z } from "zod";

const registerBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerCreateSchema = registerBaseSchema.extend({
  mode: z.literal("create"),
  householdName: z.string().min(1, "Household name is required"),
});

export const registerJoinSchema = registerBaseSchema.extend({
  mode: z.literal("join"),
  inviteCode: z.string().min(4, "Join code is required").max(10),
});

export const registerSchema = z.discriminatedUnion("mode", [
  registerCreateSchema,
  registerJoinSchema,
]);

export const joinHouseholdSchema = z.object({
  inviteCode: z.string().min(4, "Join code is required").max(10),
});

export const switchHouseholdSchema = z.object({
  householdId: z.string().min(1, "Household is required"),
});

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "Household name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const ingredientSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string(),
  defaultUnit: z.string().default("pieces"),
  photoUrl: z.string().optional(),
});

export const pantryItemSchema = z.object({
  ingredientId: z.string(),
  quantity: z.number().min(0),
  unit: z.string(),
  expiryDate: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  lowStockThreshold: z.number().optional().nullable(),
});

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.coerce.number().positive("Each ingredient needs a quantity greater than 0"),
  unit: z.string().min(1),
  isOptional: z.coerce.boolean().default(false),
});

export const recipeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  instructions: z.string().min(1, "Instructions are required"),
  prepTime: z
    .union([z.number().int().min(0), z.null()])
    .optional()
    .transform((v) => v ?? null),
  servings: z.coerce.number().int().min(1).default(4),
  photoUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
});

export const dietaryConstraintSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  rule: z.enum([
    "VEGETARIAN",
    "VEGAN",
    "NO_SEAFOOD",
    "NO_MEAT",
    "GLUTEN_FREE",
    "DAIRY_FREE",
  ]),
});

export const mealPlanSchema = z.object({
  date: z.string(),
  mealSlot: z.enum(["BREAKFAST", "LUNCH", "DINNER"]),
  recipeId: z.string(),
});

export const groceryItemSchema = z.object({
  weekStart: z.string(),
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
});

export const purchaseSchema = z.object({
  store: z.string().optional(),
  date: z.string(),
  total: z.number().positive(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number(),
        ingredientId: z.string().optional().nullable(),
        quantity: z.number().optional().nullable(),
        unit: z.string().optional().nullable(),
      })
    )
    .optional(),
});
