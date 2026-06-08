"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import {
  RecipeForm,
  type RecipeFormInitialData,
} from "@/components/recipes/recipe-form";
import { Skeleton } from "@/components/ui/skeleton";

interface RecipeApiResponse {
  id: string;
  title: string;
  instructions: string;
  prepTime: number | null;
  servings: number;
  photoUrl: string | null;
  recipeIngredients: {
    ingredientId: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    ingredient: { name: string };
  }[];
}

export default function EditRecipePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [initialData, setInitialData] = useState<RecipeFormInitialData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/recipes/${id}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const recipe: RecipeApiResponse = await res.json();
    setInitialData({
      title: recipe.title,
      instructions: recipe.instructions,
      prepTime: recipe.prepTime,
      servings: recipe.servings,
      photoUrl: recipe.photoUrl,
      ingredients: (recipe.recipeIngredients ?? []).map((ri) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        isOptional: ri.isOptional,
      })),
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <AppHeader title="Edit Recipe" />
        <div className="mx-auto max-w-lg space-y-4 p-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </>
    );
  }

  if (notFound || !initialData) {
    return (
      <>
        <AppHeader title="Edit Recipe" />
        <p className="p-4 text-center text-muted-foreground">Recipe not found</p>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Edit Recipe" />
      <RecipeForm key={id} mode="edit" recipeId={id} initialData={initialData} />
    </>
  );
}
