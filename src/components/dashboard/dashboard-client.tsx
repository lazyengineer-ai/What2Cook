"use client";

import { useEffect, useState, useCallback } from "react";
import { Package } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MatchResult } from "@/lib/match-recipes";
import {
  DashboardRescueSection,
  type RescuePayload,
} from "@/components/dashboard/dashboard-rescue-section";
import { DashboardSuggestionsSection } from "@/components/dashboard/dashboard-suggestions-section";

interface MatchData {
  cookNow: MatchResult[];
  almostThere: MatchResult[];
  useExpiring: MatchResult[];
  rescue?: RescuePayload;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardClient({ householdName }: { householdName: string }) {
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cookingId, setCookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const matchRes = await fetch("/api/match");
    const matchData = await matchRes.json();
    setData(matchData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCook(recipeId: string) {
    setCookingId(recipeId);
    await fetch(`/api/recipes/${recipeId}/cook`, { method: "POST" });
    setCookingId(null);
    load();
  }

  if (loading) {
    return (
      <>
        <AppHeader subtitle={householdName} />
        <div className="mx-auto max-w-lg space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader subtitle={householdName} />
      <div className="mx-auto max-w-lg space-y-6 p-4">
        <div>
          <h2 className="text-2xl font-bold">{getGreeting()}!</h2>
          <p className="text-muted-foreground">What should we cook today?</p>
        </div>

        <DashboardRescueSection
          rescue={data?.rescue}
          onCook={handleCook}
          cookingId={cookingId}
        />

        <section>
          <h3 className="mb-3 text-lg font-semibold">
            Cook now ({data?.cookNow.length ?? 0})
          </h3>
          {data?.cookNow.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No recipes with all ingredients in stock. Check &quot;Almost there&quot; below
                  or add more to your pantry.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data?.cookNow.map((match) => (
                <RecipeCard
                  key={match.recipeId}
                  match={match}
                  showCookButton
                  onCook={handleCook}
                  cooking={cookingId === match.recipeId}
                />
              ))}
            </div>
          )}
        </section>

        {(data?.almostThere.length ?? 0) > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-semibold">
              Almost there ({data?.almostThere.length})
            </h3>
            <div className="space-y-3">
              {data?.almostThere.map((match) => (
                <RecipeCard key={match.recipeId} match={match} />
              ))}
            </div>
          </section>
        )}

        <DashboardSuggestionsSection />
      </div>
    </>
  );
}
