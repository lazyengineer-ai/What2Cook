"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Clock, ChefHat, Trash2, Pencil } from "lucide-react";
import { scoreRecipe, type RecipeWithIngredients } from "@/lib/match-recipes";
import { formatQuantity } from "@/lib/utils";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [pantry, setPantry] = useState<
    Parameters<typeof scoreRecipe>[1]
  >([]);
  const [loading, setLoading] = useState(true);
  const [cooking, setCooking] = useState(false);

  const load = useCallback(async () => {
    const [recipeRes, pantryRes] = await Promise.all([
      fetch(`/api/recipes/${id}`),
      fetch("/api/pantry"),
    ]);
    if (recipeRes.ok) setRecipe(await recipeRes.json());
    setPantry(await pantryRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCook() {
    setCooking(true);
    await fetch(`/api/recipes/${id}/cook`, { method: "POST" });
    setCooking(false);
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  if (loading) {
    return (
      <>
        <AppHeader title="Recipe" />
        <div className="mx-auto max-w-lg space-y-4 p-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </>
    );
  }

  if (!recipe) {
    return (
      <>
        <AppHeader title="Recipe" />
        <p className="p-4 text-center text-muted-foreground">Recipe not found</p>
      </>
    );
  }

  const match = scoreRecipe(recipe, pantry);

  return (
    <>
      <AppHeader title={recipe.title} />
      <div className="mx-auto max-w-lg space-y-6 p-4 pb-8">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
          {recipe.photoUrl ? (
            <Image
              src={recipe.photoUrl}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ChefHat className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                match.matchScore === 100
                  ? "success"
                  : match.matchScore >= 70
                    ? "warning"
                    : "secondary"
              }
            >
              {match.matchScore}% match
            </Badge>
            {recipe.prepTime && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {recipe.prepTime} min
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {recipe.servings} servings
            </span>
          </div>
        </div>

        {match.matchScore === 100 && (
          <Button className="w-full" onClick={handleCook} disabled={cooking}>
            {cooking ? "Updating pantry..." : "Cooked it!"}
          </Button>
        )}

        <section>
          <h3 className="mb-3 font-semibold">Ingredients</h3>
          <div className="space-y-2">
            {recipe.recipeIngredients.map((ri) => {
              const inPantry = match.missingIngredients.every(
                (m) => m.ingredientId !== ri.ingredientId
              );
              return (
                <Card key={ri.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">
                        {ri.ingredient.name}
                        {ri.isOptional && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (optional)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatQuantity(ri.quantity, ri.unit)}
                      </p>
                    </div>
                    <Badge variant={inPantry ? "success" : "destructive"}>
                      {inPantry ? "In stock" : "Missing"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Instructions</h3>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {recipe.instructions}
          </div>
        </section>

        {recipe.lastCookedAt && (
          <p className="text-xs text-muted-foreground">
            Last cooked: {new Date(recipe.lastCookedAt).toLocaleDateString()} (
            {recipe.cookCount} times)
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/recipes/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit recipe
            </Link>
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}
