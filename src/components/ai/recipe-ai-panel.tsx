"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecipeFormInitialData } from "@/components/recipes/recipe-form";

interface RecipeAiPanelProps {
  onUseDraft: (draft: RecipeFormInitialData) => void;
}

export function RecipeAiPanel({ onUseDraft }: RecipeAiPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [servings, setServings] = useState("4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<RecipeFormInitialData | null>(null);
  const [unresolved, setUnresolved] = useState<{ name: string; reason: string }[]>([]);

  async function generate() {
    if (prompt.trim().length < 3) {
      setError("Describe your dish in at least 3 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setDraft(null);
    setUnresolved([]);

    const res = await fetch("/api/ai/recipe-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt.trim(),
        servings: parseInt(servings, 10) || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to generate draft");
      setLoading(false);
      return;
    }

    setDraft(json.draft);
    setUnresolved(json.unresolvedIngredients ?? []);
    setLoading(false);
  }

  const instructionPreview = draft?.instructions
    .split("\n")
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">AI recipe draft</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipe-prompt">Describe a dish or paste ingredients</Label>
          <textarea
            id="recipe-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. creamy tomato pasta with basil, 30 minutes"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={1000}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipe-servings">Servings (optional)</Label>
          <Input
            id="recipe-servings"
            type="number"
            min={1}
            max={20}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-24"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate draft"}
        </Button>

        {draft && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            <p className="font-medium">{draft.title}</p>
            <p className="text-sm text-muted-foreground">
              {draft.ingredients.length} ingredient
              {draft.ingredients.length === 1 ? "" : "s"}
              {instructionPreview ? ` · ${instructionPreview}` : ""}
            </p>
            {unresolved.length > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Unresolved: {unresolved.map((u) => u.name).join(", ")}
              </p>
            )}
            <Button variant="secondary" size="sm" onClick={() => onUseDraft(draft)}>
              Use this draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
