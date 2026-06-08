"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MatchResult } from "@/lib/match-recipes";
import { formatQuantity } from "@/lib/utils";

interface RecipeCardProps {
  match: MatchResult;
  showCookButton?: boolean;
  onCook?: (recipeId: string) => void;
  cooking?: boolean;
}

export function RecipeCard({
  match,
  showCookButton,
  onCook,
  cooking,
}: RecipeCardProps) {
  const scoreVariant =
    match.matchScore === 100
      ? "success"
      : match.matchScore >= 70
        ? "warning"
        : "secondary";

  return (
    <Card className="overflow-hidden">
      <Link href={`/recipes/${match.recipeId}`}>
        <div className="flex gap-3 p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {match.photoUrl ? (
              <Image
                src={match.photoUrl}
                alt={match.title}
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
              <h3 className="font-semibold leading-tight">{match.title}</h3>
              <Badge variant={scoreVariant}>{match.matchScore}%</Badge>
            </div>
            {match.prepTime && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {match.prepTime} min
              </p>
            )}
            {match.missingIngredients.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                Missing:{" "}
                {match.missingIngredients
                  .map((m) => `${m.name} (${formatQuantity(m.quantity, m.unit)})`)
                  .join(", ")}
              </p>
            )}
            {match.expiringIngredients.length > 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Uses expiring: {match.expiringIngredients.join(", ")}
              </p>
            )}
          </div>
        </div>
      </Link>
      {showCookButton && match.matchScore === 100 && onCook && (
        <CardContent className="pt-0">
          <Button
            className="w-full"
            size="sm"
            onClick={() => onCook(match.recipeId)}
            disabled={cooking}
          >
            {cooking ? "Updating pantry..." : "Cooked it!"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
