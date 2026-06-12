"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeCard } from "@/components/recipes/recipe-card";
import type { RescueRecipe } from "@/lib/expiring-rescue";
import { format } from "date-fns";

export interface ExpiringItem {
  id: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  ingredient: { name: string; category: { icon: string | null } };
}

export interface RescuePayload {
  expiringItems: ExpiringItem[];
  rankedRecipes: RescueRecipe[];
}

interface DashboardRescueSectionProps {
  rescue: RescuePayload | null | undefined;
  onCook: (recipeId: string) => void;
  cookingId: string | null;
}

export function DashboardRescueSection({
  rescue,
  onCook,
  cookingId,
}: DashboardRescueSectionProps) {
  const expiring = rescue?.expiringItems ?? [];
  const rankedRecipes = rescue?.rankedRecipes ?? [];

  if (expiring.length === 0 && rankedRecipes.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          Rescue ({expiring.length} item{expiring.length === 1 ? "" : "s"} expiring)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiring.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {expiring.map((item) => (
              <p key={item.id} className="text-sm">
                {item.ingredient.category.icon} {item.ingredient.name} —{" "}
                {format(new Date(item.expiryDate), "EEE, MMM d")}
              </p>
            ))}
          </div>
        )}

        {expiring.length > 0 && rankedRecipes.length > 0 && (
          <hr className="border-amber-200 dark:border-amber-800" />
        )}

        {rankedRecipes.length > 0 && (
          <div className="space-y-3">
            {rankedRecipes.map((match, index) => (
              <RecipeCard
                key={match.recipeId}
                match={match}
                showCookButton={index === 0}
                onCook={index === 0 ? onCook : undefined}
                cooking={index === 0 && cookingId === match.recipeId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
