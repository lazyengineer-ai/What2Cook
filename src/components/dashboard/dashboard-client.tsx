"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, AlertTriangle, Package } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MatchResult } from "@/lib/match-recipes";
import { format } from "date-fns";

interface MatchData {
  cookNow: MatchResult[];
  almostThere: MatchResult[];
  useExpiring: MatchResult[];
}

interface ExpiringItem {
  id: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  ingredient: { name: string; category: { icon: string | null } };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardClient({ householdName }: { householdName: string }) {
  const [data, setData] = useState<MatchData | null>(null);
  const [expiring, setExpiring] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cookingId, setCookingId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<
    { title: string; reason: string; missingIngredients: string[] }[] | null
  >(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    const [matchRes, forecastRes] = await Promise.all([
      fetch("/api/match"),
      fetch("/api/forecast"),
    ]);
    const matchData = await matchRes.json();
    const forecastData = await forecastRes.json();
    setData(matchData);
    setExpiring(forecastData.expiring ?? []);
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

  async function getAiSuggestions() {
    setAiLoading(true);
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: new Date().toISOString() }),
    });
    if (res.ok) {
      const json = await res.json();
      setAiSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
    } else {
      setAiSuggestions([]);
    }
    setAiLoading(false);
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

        {expiring.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Expiring soon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {expiring.map((item) => (
                <p key={item.id} className="text-sm">
                  {item.ingredient.category.icon} {item.ingredient.name} —{" "}
                  {format(new Date(item.expiryDate), "EEE, MMM d")}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

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

        {(data?.useExpiring.length ?? 0) > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-semibold">Use expiring items</h3>
            <div className="space-y-3">
              {data?.useExpiring.slice(0, 5).map((match) => (
                <RecipeCard key={match.recipeId} match={match} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">AI inspiration</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={getAiSuggestions}
              disabled={aiLoading}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {aiLoading ? "Thinking..." : "Suggest meals"}
            </Button>
          </div>
          {aiSuggestions && (
            <div className="space-y-3">
              {aiSuggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No suggestions available. Configure OPENAI_API_KEY for AI features.
                </p>
              ) : (
                aiSuggestions.map((s, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <p className="font-semibold">{s.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{s.reason}</p>
                      {s.missingIngredients?.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Need: {s.missingIngredients.join(", ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
