"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AiSuggestionCard } from "@/components/ai/ai-suggestion-card";
import type { Suggestion } from "@/lib/ai/schemas";

export function DashboardSuggestionsSection() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [pantryCount, setPantryCount] = useState<number | null>(null);

  async function getSuggestions() {
    setLoading(true);
    setError("");
    setWarning("");

    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date().toISOString(),
        preferences: preferences.trim() || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSuggestions(null);
      setError(json.error ?? "Failed to get suggestions");
      setLoading(false);
      return;
    }

    setSuggestions(Array.isArray(json.suggestions) ? json.suggestions : []);
    setPantryCount(typeof json.pantryCount === "number" ? json.pantryCount : null);
    if (json.warning) setWarning(json.warning);
    setLoading(false);
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI inspiration</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={getSuggestions}
          disabled={loading}
        >
          <Sparkles className="mr-1 h-4 w-4" />
          {loading ? "Thinking..." : "Suggest meals"}
        </Button>
      </div>

      <Input
        value={preferences}
        onChange={(e) => setPreferences(e.target.value)}
        placeholder="Preferences — e.g. quick, vegetarian, spicy"
        className="mb-3"
        maxLength={300}
      />

      {error && (
        <p className="mb-3 text-sm text-destructive">{error}</p>
      )}
      {warning && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">{warning}</p>
      )}

      {suggestions && (
        <div className="space-y-3">
          {pantryCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add items to your pantry to get personalized suggestions.
            </p>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suggestions available right now.
            </p>
          ) : (
            suggestions.map((s, i) =>
              s.source === "ai" ? (
                <AiSuggestionCard key={`ai-${i}`} suggestion={s} />
              ) : (
                <Card key={`saved-${s.matchedRecipeId ?? i}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Saved recipe</Badge>
                    </div>
                    <p className="mt-2 font-semibold">
                      {s.matchedRecipeId ? (
                        <Link
                          href={`/recipes/${s.matchedRecipeId}`}
                          className="hover:underline"
                        >
                          {s.title}
                        </Link>
                      ) : (
                        s.title
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.reason}</p>
                    {s.missingIngredients?.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Need: {s.missingIngredients.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            )
          )}
        </div>
      )}
    </section>
  );
}
