import { DietaryRule } from "@prisma/client";
import type { RecipeWithIngredients } from "@/lib/match-recipes";

const MEAT_CATEGORIES = ["meat", "poultry"];
const SEAFOOD_CATEGORIES = ["seafood"];
const DAIRY_CATEGORIES = ["dairy"];

export function recipeViolatesConstraint(
  recipe: RecipeWithIngredients,
  rules: DietaryRule[]
): string | null {
  for (const rule of rules) {
    for (const ri of recipe.recipeIngredients) {
      if (ri.isOptional) continue;
      const slug = ri.ingredient.category.slug.toLowerCase();

      switch (rule) {
        case "VEGETARIAN":
        case "VEGAN":
          if (
            MEAT_CATEGORIES.includes(slug) ||
            SEAFOOD_CATEGORIES.includes(slug)
          ) {
            return `${recipe.title} contains ${ri.ingredient.name} (${rule.toLowerCase()} day)`;
          }
          if (rule === "VEGAN" && DAIRY_CATEGORIES.includes(slug)) {
            return `${recipe.title} contains ${ri.ingredient.name} (vegan day)`;
          }
          break;
        case "NO_MEAT":
          if (MEAT_CATEGORIES.includes(slug)) {
            return `${recipe.title} contains ${ri.ingredient.name} (no meat day)`;
          }
          break;
        case "NO_SEAFOOD":
          if (SEAFOOD_CATEGORIES.includes(slug)) {
            return `${recipe.title} contains ${ri.ingredient.name} (no seafood day)`;
          }
          break;
        case "DAIRY_FREE":
          if (DAIRY_CATEGORIES.includes(slug)) {
            return `${recipe.title} contains ${ri.ingredient.name} (dairy-free day)`;
          }
          break;
      }
    }
  }
  return null;
}

export function filterRecipesByConstraints(
  recipes: RecipeWithIngredients[],
  rules: DietaryRule[]
): RecipeWithIngredients[] {
  if (rules.length === 0) return recipes;
  return recipes.filter((r) => !recipeViolatesConstraint(r, rules));
}

export const DIETARY_RULE_LABELS: Record<DietaryRule, string> = {
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  NO_SEAFOOD: "No Seafood",
  NO_MEAT: "No Meat",
  GLUTEN_FREE: "Gluten Free",
  DAIRY_FREE: "Dairy Free",
};