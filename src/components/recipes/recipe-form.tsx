"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IngredientSearch } from "@/components/pantry/ingredient-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { UNITS } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";

export interface RecipeIngredientRow {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

export interface RecipeFormInitialData {
  title: string;
  instructions: string;
  prepTime: number | null;
  servings: number;
  photoUrl: string | null;
  ingredients: RecipeIngredientRow[];
}

interface RecipeFormProps {
  mode: "create" | "edit";
  recipeId?: string;
  initialData?: RecipeFormInitialData;
}

export function RecipeForm({ mode, recipeId, initialData }: RecipeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");
  const [prepTime, setPrepTime] = useState(
    initialData?.prepTime != null ? String(initialData.prepTime) : ""
  );
  const [servings, setServings] = useState(
    initialData?.servings != null ? String(initialData.servings) : "4"
  );
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl ?? "");
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>(
    initialData?.ingredients ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addIngredient(ing: { id: string; name: string; defaultUnit: string }) {
    if (ingredients.some((i) => i.ingredientId === ing.id)) return;
    setIngredients([
      ...ingredients,
      {
        ingredientId: ing.id,
        name: ing.name,
        quantity: 1,
        unit: ing.defaultUnit,
        isOptional: false,
      },
    ]);
  }

  function updateIngredient(index: number, updates: Partial<RecipeIngredientRow>) {
    setIngredients(
      ingredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  async function save() {
    if (!title || !instructions || ingredients.length === 0) {
      setError("Title, instructions, and at least one ingredient are required");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      title,
      instructions,
      prepTime: prepTime ? parseInt(prepTime) : null,
      servings: parseInt(servings),
      photoUrl: photoUrl || null,
      tags: [],
      ingredients: ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity,
        unit: i.unit,
        isOptional: i.isOptional,
      })),
    };

    const url = mode === "edit" ? `/api/recipes/${recipeId}` : "/api/recipes";
    const method = mode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }

    const recipe = await res.json();
    router.push(`/recipes/${recipe.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 pb-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Recipe photo</Label>
          <UploadButton
            endpoint="recipeImage"
            onClientUploadComplete={(res) => {
              if (res?.[0]?.url) setPhotoUrl(res[0].url);
            }}
          />
          {photoUrl && (
            <p className="text-xs text-green-600 dark:text-green-400">Photo uploaded</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prep time (min)</Label>
            <Input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Servings</Label>
            <Input
              type="number"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Instructions</Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step instructions..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Ingredients</Label>
        <IngredientSearch
          onSelect={addIngredient}
          placeholder="Search and add ingredients..."
        />

        {ingredients.map((ing, index) => (
          <Card key={ing.ingredientId}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{ing.name}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={ing.quantity}
                  onChange={(e) =>
                    updateIngredient(index, {
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="any"
                />
                <Select
                  value={ing.unit}
                  onValueChange={(v) => updateIngredient(index, { unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={ing.isOptional}
                  onCheckedChange={(c) =>
                    updateIngredient(index, { isOptional: c === true })
                  }
                />
                Optional ingredient
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full" onClick={save} disabled={saving}>
        {saving
          ? "Saving..."
          : mode === "edit"
            ? "Save changes"
            : "Save recipe"}
      </Button>
    </div>
  );
}
