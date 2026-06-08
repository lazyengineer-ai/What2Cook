"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChefHat, Clock, Heart } from "lucide-react";
import { scoreRecipe, type RecipeWithIngredients, type PantryItemWithIngredient } from "@/lib/match-recipes";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [pantry, setPantry] = useState<PantryItemWithIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"match" | "recent" | "favorites">("match");

  const load = useCallback(async () => {
    const [recipesRes, pantryRes] = await Promise.all([
      fetch("/api/recipes"),
      fetch("/api/pantry"),
    ]);
    setRecipes(await recipesRes.json());
    setPantry(await pantryRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFavorite(id: string, isFavorite: boolean) {
    await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !isFavorite }),
    });
    load();
  }

  const scored = recipes.map((r) => ({
    recipe: r,
    match: scoreRecipe(r, pantry),
  }));

  const sorted = [...scored].sort((a, b) => {
    if (sort === "match") return b.match.matchScore - a.match.matchScore;
    if (sort === "favorites") {
      if (a.recipe.isFavorite && !b.recipe.isFavorite) return -1;
      if (!a.recipe.isFavorite && b.recipe.isFavorite) return 1;
    }
    return (
      new Date(b.recipe.updatedAt).getTime() -
      new Date(a.recipe.updatedAt).getTime()
    );
  });

  return (
    <>
      <AppHeader title="Recipes" />
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="flex gap-2">
          <Link href="/recipes/new" className="flex-1">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              New recipe
            </Button>
          </Link>
        </div>

        <div className="flex gap-2">
          {(["match", "recent", "favorites"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSort(s)}
            >
              {s === "match" ? "Best match" : s === "recent" ? "Recent" : "Favorites"}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <ChefHat className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No recipes yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first recipe to get cooking suggestions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map(({ recipe, match }) => (
              <Card key={recipe.id} className="overflow-hidden">
                <Link href={`/recipes/${recipe.id}`}>
                  <div className="flex gap-3 p-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {recipe.photoUrl ? (
                        <Image
                          src={recipe.photoUrl}
                          alt={recipe.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ChefHat className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{recipe.title}</h3>
                        <Badge
                          variant={
                            match.matchScore === 100
                              ? "success"
                              : match.matchScore >= 70
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {match.matchScore}%
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {recipe.prepTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.prepTime} min
                          </span>
                        )}
                        <span>{recipe.recipeIngredients.length} ingredients</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(recipe.id, recipe.isFavorite);
                      }}
                    >
                      <Heart
                        className={`h-5 w-5 ${recipe.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </Button>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
