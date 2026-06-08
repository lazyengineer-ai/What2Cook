import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  householdName: z.string().min(1, "Household name is required"),
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
  ingredientId: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  isOptional: z.boolean().default(false),
});

export const recipeSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  prepTime: z.number().optional().nullable(),
  servings: z.number().int().positive().default(4),
  photoUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1),
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
