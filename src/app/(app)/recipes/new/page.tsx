import { AppHeader } from "@/components/layout/app-header";
import { NewRecipeClient } from "@/components/recipes/new-recipe-client";

export default function NewRecipePage() {
  return (
    <>
      <AppHeader title="New Recipe" />
      <NewRecipeClient />
    </>
  );
}
