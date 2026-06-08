import { AppHeader } from "@/components/layout/app-header";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default function NewRecipePage() {
  return (
    <>
      <AppHeader title="New Recipe" />
      <RecipeForm mode="create" />
    </>
  );
}
