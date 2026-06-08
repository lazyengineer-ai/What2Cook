"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
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

interface RecipeIngredientRow {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servings, setServings] = useState("4");
  const [photoUrl, setPhotoUrl] = useState("");
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([]);
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

    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
      return;
    }

    const recipe = await res.json();
    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <>
      <AppHeader title="New Recipe" />
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
              <p className="text-xs text-green-600">Photo uploaded</p>
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
          {saving ? "Saving..." : "Save recipe"}
        </Button>
      </div>
    </>
  );
}
