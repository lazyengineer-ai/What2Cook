"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Suggestion } from "@/lib/ai/schemas";
import { formatDateOnly } from "@/lib/utils";

interface AiSuggestionCardProps {
  suggestion: Suggestion;
  onAddedToPlan?: () => void;
}

export function AiSuggestionCard({ suggestion, onAddedToPlan }: AiSuggestionCardProps) {
  const router = useRouter();
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planDate, setPlanDate] = useState(formatDateOnly(new Date()));
  const [mealSlot, setMealSlot] = useState<"BREAKFAST" | "LUNCH" | "DINNER">("DINNER");
  const [planWarning, setPlanWarning] = useState("");

  async function saveAsRecipe() {
    setSavingRecipe(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/ai/suggestion-to-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${suggestion.title}\n${suggestion.reason}`,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to generate recipe");
      setSavingRecipe(false);
      return;
    }

    sessionStorage.setItem("recipe-ai-draft", JSON.stringify(json.draft));
    router.push("/recipes/new");
  }

  async function addToMealPlan() {
    setAddingToPlan(true);
    setError("");
    setSuccess("");
    setPlanWarning("");

    const res = await fetch("/api/ai/suggestion-to-meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: suggestion.title,
        reason: suggestion.reason,
        missingIngredients: suggestion.missingIngredients,
        date: planDate,
        mealSlot,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to add to meal plan");
      setAddingToPlan(false);
      return;
    }

    if (json.warning) setPlanWarning(json.warning);
    setSuccess(`Added "${suggestion.title}" to ${mealSlot.toLowerCase()} on ${planDate}.`);
    setPlanOpen(false);
    setAddingToPlan(false);
    onAddedToPlan?.();
  }

  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-semibold">{suggestion.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{suggestion.reason}</p>
        {suggestion.missingIngredients?.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Need: {suggestion.missingIngredients.join(", ")}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{success}</p>}
        {planWarning && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{planWarning}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveAsRecipe}
            disabled={savingRecipe || addingToPlan}
          >
            {savingRecipe ? "Generating..." : "Save as recipe"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlanOpen(true)}
            disabled={savingRecipe || addingToPlan}
          >
            Add to plan
          </Button>
        </div>

        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to meal plan</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Create &ldquo;{suggestion.title}&rdquo; and add to your plan?
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Meal</Label>
                <Select
                  value={mealSlot}
                  onValueChange={(v) =>
                    setMealSlot(v as "BREAKFAST" | "LUNCH" | "DINNER")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                    <SelectItem value="LUNCH">Lunch</SelectItem>
                    <SelectItem value="DINNER">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={addToMealPlan}
                disabled={addingToPlan}
              >
                {addingToPlan
                  ? "Creating..."
                  : `Create and add to ${mealSlot.toLowerCase()}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
