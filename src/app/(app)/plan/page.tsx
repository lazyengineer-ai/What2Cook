"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ShoppingCart, AlertCircle, Trash2, PackagePlus } from "lucide-react";
import { DAY_NAMES, formatQuantity, formatDateOnly, toDateKey } from "@/lib/utils";
import { AddGroceryItemDialog } from "@/components/plan/add-grocery-item-dialog";
import { CategoryFilter } from "@/components/pantry/category-filter";
import { Badge } from "@/components/ui/badge";

const MEAL_SLOTS = ["BREAKFAST", "LUNCH", "DINNER"] as const;
const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

interface Recipe {
  id: string;
  title: string;
}

interface MealEntry {
  id: string;
  date: string;
  mealSlot: string;
  createdAt?: string;
  recipe: Recipe;
}

interface GroceryItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  checked: boolean;
  source: string;
  ingredient: {
    name: string;
    category: { name: string; icon: string | null; slug: string };
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export default function PlanPage() {
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groceryFilter, setGroceryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [addingToPantry, setAddingToPantry] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [groceryLastGeneratedAt, setGroceryLastGeneratedAt] = useState<string | null>(
    null
  );
  const [showRegeneratePrompt, setShowRegeneratePrompt] = useState(false);

  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const load = useCallback(async () => {
    setLoading(true);
    const [planRes, recipesRes, groceryRes, catRes] = await Promise.all([
      fetch(`/api/meal-plan?weekStart=${weekStartStr}`, { credentials: "same-origin" }),
      fetch("/api/recipes", { credentials: "same-origin" }),
      fetch(`/api/grocery?weekStart=${weekStartStr}`, { credentials: "same-origin" }),
      fetch("/api/categories", { credentials: "same-origin" }),
    ]);
    const planData = planRes.ok ? await planRes.json() : { entries: [] };
    setEntries(planData.entries ?? []);
    const allRecipes = recipesRes.ok ? await recipesRes.json() : [];
    setRecipes(allRecipes.map((r: Recipe) => ({ id: r.id, title: r.title })));
    const groceryData = groceryRes.ok ? await groceryRes.json() : null;
    setGroceryItems(groceryData?.items ?? []);
    setGroceryLastGeneratedAt(groceryData?.lastGeneratedAt ?? null);
    setCategories(await catRes.json());
    setLoading(false);
  }, [weekStartStr]);

  useEffect(() => {
    load();
  }, [load]);

  async function assignMeal(date: Date, mealSlot: string, recipeId: string) {
    const res = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        date: formatDateOnly(date),
        mealSlot,
        recipeId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setWarnings((w) => [...w, data.error ?? "Failed to assign recipe"]);
      return;
    }
    if (data.warning) {
      setWarnings((w) => [...w, data.warning]);
    }
    if (data.entry) {
      setEntries((prev) => {
        const dateKey = toDateKey(data.entry.date);
        const without = prev.filter(
          (e) => !(toDateKey(e.date) === dateKey && e.mealSlot === data.entry.mealSlot)
        );
        return [...without, data.entry];
      });
      setShowRegeneratePrompt(true);
    } else {
      load();
    }
  }

  async function generateGroceryList() {
    setGenerating(true);
    await fetch("/api/grocery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: weekStartStr }),
    });
    setGenerating(false);
    setShowRegeneratePrompt(false);
    load();
  }

  async function toggleGroceryItem(itemId: string, checked: boolean) {
    await fetch("/api/grocery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, checked: !checked }),
    });
    load();
  }

  async function deleteGroceryItem(itemId: string) {
    const res = await fetch(`/api/grocery/items/${itemId}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) load();
  }

  async function addCheckedToPantry() {
    setAddingToPantry(true);
    const res = await fetch("/api/grocery/add-to-pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ weekStart: weekStartStr }),
    });
    setAddingToPantry(false);
    if (res.ok) load();
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const checkedCount = groceryItems.filter((i) => i.checked).length;

  const filteredGrocery =
    groceryFilter === "all"
      ? groceryItems
      : groceryItems.filter((i) => i.ingredient.category.slug === groceryFilter);

  const groceryCategoryCounts = groceryItems.reduce(
    (acc, item) => {
      const slug = item.ingredient.category.slug;
      acc[slug] = (acc[slug] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const groupedGrocery = filteredGrocery.reduce(
    (acc, item) => {
      const key = item.ingredient.category.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, GroceryItem[]>
  );

  const categoryOrder = new Map(categories.map((c, i) => [c.name, i]));
  const sortedGroceryGroups = Object.entries(groupedGrocery).sort(
    ([a], [b]) => (categoryOrder.get(a) ?? 99) - (categoryOrder.get(b) ?? 99)
  );

  const showGroceryGrouped = groceryFilter === "all";

  const groceryStale =
    Boolean(groceryLastGeneratedAt) &&
    entries.some(
      (e) =>
        e.createdAt &&
        new Date(e.createdAt) > new Date(groceryLastGeneratedAt!)
    );

  return (
    <>
      <AppHeader title="Meal Plan" />
      <div className="mx-auto max-w-lg p-4">
        <Tabs defaultValue="planner">
          <TabsList>
            <TabsTrigger value="planner">Planner</TabsTrigger>
            <TabsTrigger value="grocery" className="relative">
              Grocery List
              {groceryStale && (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500"
                  aria-label="Grocery list may be out of date"
                />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {warnings.length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardContent className="flex items-start gap-2 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    {warnings.slice(-3).map((w, i) => (
                      <p key={i} className="text-xs text-amber-800 dark:text-amber-300">
                        {w}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showRegeneratePrompt && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Meal plan changed — update grocery list?
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRegeneratePrompt(false)}
                    >
                      Dismiss
                    </Button>
                    <Button size="sm" onClick={generateGroceryList} disabled={generating}>
                      {generating ? "Updating..." : "Update list"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                {days.map((day) => {
                  const dayEntries = entries.filter(
                    (e) => toDateKey(e.date) === formatDateOnly(day)
                  );
                  return (
                    <Card key={day.toISOString()}>
                      <CardContent className="p-4">
                        <p className="mb-3 font-semibold">
                          {DAY_NAMES[day.getDay()]} · {format(day, "MMM d")}
                        </p>
                        <div className="space-y-2">
                          {MEAL_SLOTS.map((slot) => {
                            const entry = dayEntries.find((e) => e.mealSlot === slot);
                            return (
                              <div key={slot} className="flex items-center gap-2">
                                <span className="w-20 text-xs text-muted-foreground">
                                  {MEAL_LABELS[slot]}
                                </span>
                                <Select
                                  value={entry?.recipe.id}
                                  onValueChange={(recipeId) =>
                                    assignMeal(day, slot, recipeId)
                                  }
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Choose recipe" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {recipes.map((r) => (
                                      <SelectItem key={r.id} value={r.id}>
                                        {r.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grocery" className="space-y-4">
            <Button
              className="w-full"
              onClick={generateGroceryList}
              disabled={generating}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {generating ? "Generating..." : "Generate from meal plan"}
            </Button>

            <AddGroceryItemDialog weekStart={weekStartStr} onAdded={load} />

            {checkedCount > 0 && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={addCheckedToPantry}
                disabled={addingToPantry}
              >
                <PackagePlus className="mr-2 h-4 w-4" />
                {addingToPantry
                  ? "Adding to pantry..."
                  : `Add ${checkedCount} checked item${checkedCount === 1 ? "" : "s"} to pantry`}
              </Button>
            )}

            {groceryItems.length > 0 && (
              <CategoryFilter
                categories={categories}
                value={groceryFilter}
                onChange={setGroceryFilter}
                counts={groceryCategoryCounts}
              />
            )}

            {groceryItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No grocery list yet. Generate from your meal plan or add items manually.
              </p>
            ) : filteredGrocery.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No items in this category.
              </p>
            ) : showGroceryGrouped ? (
              sortedGroceryGroups.map(([category, items]) => (
                <div key={category}>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <span className="text-base">{items[0]?.ingredient.category.icon}</span>
                    {category}
                    <span className="text-xs font-normal">({items.length})</span>
                  </h3>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <GroceryListRow
                        key={item.id}
                        item={item}
                        onToggle={toggleGroceryItem}
                        onDelete={deleteGroceryItem}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-1">
                {filteredGrocery.map((item) => (
                  <GroceryListRow
                    key={item.id}
                    item={item}
                    onToggle={toggleGroceryItem}
                    onDelete={deleteGroceryItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function GroceryListRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 touch-target">
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id, item.checked)}
      />
      <span className="text-lg leading-none">{item.ingredient.category.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={
              item.checked ? "line-through text-muted-foreground" : ""
            }
          >
            {item.ingredient.name}
          </span>
          {item.source === "MANUAL" && (
            <Badge variant="outline" className="text-xs">
              Manual
            </Badge>
          )}
          {item.source === "LOW_STOCK" && (
            <Badge variant="secondary" className="text-xs">
              Low stock
            </Badge>
          )}
        </div>
      </div>
      <span className="text-sm text-muted-foreground">
        {formatQuantity(item.quantity, item.unit)}
      </span>
      {item.source === "MANUAL" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item.id)}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}
