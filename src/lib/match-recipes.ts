import type { PantryItem, Recipe, RecipeIngredient, Ingredient } from "@prisma/client";

export type RecipeWithIngredients = Recipe & {
  recipeIngredients: (RecipeIngredient & {
    ingredient: Ingredient & { category: { name: string; icon: string | null; slug: string } };
  })[];
};

export type PantryItemWithIngredient = PantryItem & {
  ingredient: Ingredient & { category: { name: string; icon: string | null; slug: string } };
};

export interface MatchResult {
  recipeId: string;
  title: string;
  photoUrl: string | null;
  prepTime: number | null;
  servings: number;
  matchScore: number;
  availableCount: number;
  requiredCount: number;
  missingIngredients: {
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  expiringIngredients: string[];
}

export function scoreRecipe(
  recipe: RecipeWithIngredients,
  pantry: PantryItemWithIngredient[]
): MatchResult {
  const pantryMap = new Map(
    pantry.map((p) => [p.ingredientId, p])
  );

  const required = recipe.recipeIngredients.filter((ri) => !ri.isOptional);
  const totalRequired = required.length || recipe.recipeIngredients.length;
  const ingredientsToCheck =
    required.length > 0 ? required : recipe.recipeIngredients;

  let availableCount = 0;
  const missingIngredients: MatchResult["missingIngredients"] = [];
  const expiringIngredients: string[] = [];
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  for (const ri of ingredientsToCheck) {
    const pantryItem = pantryMap.get(ri.ingredientId);
    if (pantryItem && pantryItem.quantity >= ri.quantity) {
      availableCount++;
      if (
        pantryItem.expiryDate &&
        new Date(pantryItem.expiryDate) <= threeDaysFromNow
      ) {
        expiringIngredients.push(ri.ingredient.name);
      }
    } else {
      missingIngredients.push({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
      });
    }
  }

  const matchScore =
    totalRequired > 0 ? Math.round((availableCount / totalRequired) * 100) : 0;

  return {
    recipeId: recipe.id,
    title: recipe.title,
    photoUrl: recipe.photoUrl,
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    matchScore,
    availableCount,
    requiredCount: totalRequired,
    missingIngredients,
    expiringIngredients,
  };
}

export function scoreAllRecipes(
  recipes: RecipeWithIngredients[],
  pantry: PantryItemWithIngredient[]
): MatchResult[] {
  return recipes
    .map((r) => scoreRecipe(r, pantry))
    .sort((a, b) => b.matchScore - a.matchScore);
}
