"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { IngredientSearch } from "@/components/pantry/ingredient-search";
import { CategoryFilter } from "@/components/pantry/category-filter";
import { PantryItemCard } from "@/components/pantry/pantry-item-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { UNITS, formatQuantity } from "@/lib/utils";
import { isExpiringSoon, isLowStock } from "@/lib/pantry-utils";
import {
  groupBatchesByIngredient,
  type IngredientBatchGroup,
} from "@/lib/pantry-batches";
import type { PantryItemWithIngredient } from "@/lib/match-recipes";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItemWithIngredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id: string;
    name: string;
    defaultUnit: string;
  } | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieces");
  const [expiryDate, setExpiryDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [pantryRes, catRes] = await Promise.all([
      fetch("/api/pantry", { credentials: "same-origin" }),
      fetch("/api/categories", { credentials: "same-origin" }),
    ]);
    setItems(await pantryRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const existingBatchesForSelected = useMemo(() => {
    if (!selectedIngredient) return [];
    return items.filter((i) => i.ingredientId === selectedIngredient.id);
  }, [items, selectedIngredient]);

  const existingTotalQty = useMemo(
    () => existingBatchesForSelected.reduce((sum, i) => sum + i.quantity, 0),
    [existingBatchesForSelected]
  );

  async function addToPantry() {
    if (!selectedIngredient) return;
    setSaving(true);
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ingredientId: selectedIngredient.id,
        quantity: parseFloat(quantity),
        unit,
        expiryDate: expiryDate || null,
      }),
    });
    setSaving(false);
    setAddOpen(false);
    setSelectedIngredient(null);
    setQuantity("1");
    setExpiryDate("");
    load();
  }

  const expiringCount = useMemo(
    () => items.filter((i) => isExpiringSoon(i.expiryDate)).length,
    [items]
  );

  const lowStockCount = useMemo(
    () => items.filter((i) => isLowStock(i.quantity, i.lowStockThreshold)).length,
    [items]
  );

  const filtered = useMemo(() => {
    let result = items;

    if (filterCategory === "expiring") {
      result = result.filter((i) => isExpiringSoon(i.expiryDate));
    } else if (filterCategory === "low-stock") {
      result = result.filter((i) => isLowStock(i.quantity, i.lowStockThreshold));
    } else if (filterCategory !== "all") {
      result = result.filter((i) => i.ingredient.category.slug === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((i) =>
        i.ingredient.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, filterCategory, searchQuery]);

  const categoryCounts = items.reduce(
    (acc, item) => {
      const slug = item.ingredient.category.slug;
      acc[slug] = (acc[slug] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const groupedByCategory = useMemo(() => {
    const order = new Map(categories.map((c, i) => [c.name, i]));
    const ingredientGroups = groupBatchesByIngredient(filtered);
    const byCategory = new Map<string, IngredientBatchGroup[]>();

    for (const group of ingredientGroups) {
      const key = group.category.name;
      const list = byCategory.get(key) ?? [];
      list.push(group);
      byCategory.set(key, list);
    }

    return Array.from(byCategory.entries()).sort(
      ([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99)
    );
  }, [filtered, categories]);

  const showGrouped =
    filterCategory === "all" && !searchQuery.trim();

  const emptyMessage = searchQuery.trim()
    ? `No items matching "${searchQuery.trim()}"`
    : filterCategory === "expiring"
      ? "Nothing expiring soon — nice work!"
      : filterCategory === "low-stock"
        ? "No low stock items right now."
        : filterCategory === "all"
          ? "No items in pantry yet. Add your first ingredient!"
          : `No ${categories.find((c) => c.slug === filterCategory)?.name ?? "items"} in your pantry.`;

  function renderIngredientGroup(group: IngredientBatchGroup, nested: boolean) {
    const multiBatch = group.batches.length > 1;
    return (
      <div key={group.ingredientId} className={nested ? "mb-4" : "mb-2"}>
        {(nested || multiBatch) && (
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            {group.name}
            <span className="text-xs font-normal text-muted-foreground">
              ({formatQuantity(group.totalQuantity, group.unit)} total
              {multiBatch ? ` · ${group.batches.length} batches` : ""})
            </span>
          </h4>
        )}
        <div className={`space-y-2 ${nested && multiBatch ? "ml-2 border-l-2 border-muted pl-3" : ""}`}>
          {group.batches.map((batch) => (
            <PantryItemCard
              key={batch.id}
              item={batch}
              onUpdate={load}
              compact={nested || multiBatch}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader title="Pantry" />
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add to pantry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add ingredient to pantry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <IngredientSearch
                onSelect={(ing) => {
                  setSelectedIngredient(ing);
                  setUnit(ing.defaultUnit);
                }}
              />
              {selectedIngredient && (
                <>
                  <p className="text-sm font-medium">
                    Selected: {selectedIngredient.name}
                  </p>
                  {existingBatchesForSelected.length > 0 && (
                    <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                      Adds a new batch — your existing{" "}
                      {formatQuantity(existingTotalQty, existingBatchesForSelected[0]?.unit ?? unit)}{" "}
                      across {existingBatchesForSelected.length} batch
                      {existingBatchesForSelected.length === 1 ? "" : "es"} will stay
                      separate.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="0"
                        step="any"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select value={unit} onValueChange={setUnit}>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry date (optional)</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={addToPantry}
                    disabled={saving}
                  >
                    {saving
                      ? "Adding..."
                      : existingBatchesForSelected.length > 0
                        ? "Add new batch"
                        : "Add to pantry"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pantry..."
            className="pl-9"
          />
        </div>

        <CategoryFilter
          categories={categories}
          value={filterCategory}
          onChange={setFilterCategory}
          counts={categoryCounts}
          extraFilters={[
            { slug: "expiring", emoji: "⚠️", label: "Expiring", count: expiringCount },
            { slug: "low-stock", emoji: "📉", label: "Low", count: lowStockCount },
          ]}
        />

        <div className="mt-2">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : showGrouped ? (
            groupedByCategory.map(([categoryName, ingredientGroups]) => {
              const icon = ingredientGroups[0]?.category.icon;
              const batchCount = ingredientGroups.reduce(
                (n, g) => n + g.batches.length,
                0
              );
              return (
                <div key={categoryName} className="mb-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <span className="text-base">{icon}</span>
                    {categoryName}
                    <span className="text-xs font-normal">({batchCount})</span>
                  </h3>
                  {ingredientGroups.map((group) =>
                    renderIngredientGroup(group, true)
                  )}
                </div>
              );
            })
          ) : (
            <div className="space-y-2">
              {groupBatchesByIngredient(filtered).map((group) =>
                renderIngredientGroup(group, false)
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
