"use client";

import { useEffect, useState, useCallback } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { IngredientSearch } from "@/components/pantry/ingredient-search";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { UNITS } from "@/lib/utils";

interface PantryItem {
  id: string;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  photoUrl: string | null;
  ingredient: {
    id: string;
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

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
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
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [pantryRes, catRes] = await Promise.all([
      fetch("/api/pantry"),
      fetch("/api/categories"),
    ]);
    setItems(await pantryRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addToPantry() {
    if (!selectedIngredient) return;
    setSaving(true);
    await fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  const filtered =
    filterCategory === "all"
      ? items
      : items.filter((i) => i.ingredient.category.slug === filterCategory);

  const grouped = filtered.reduce(
    (acc, item) => {
      const key = item.ingredient.category.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, PantryItem[]>
  );

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
                    {saving ? "Adding..." : "Add to pantry"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Tabs value={filterCategory} onValueChange={setFilterCategory}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c.id} value={c.slug}>
                {c.icon}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={filterCategory} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No items in pantry yet. Add your first ingredient!
              </p>
            ) : filterCategory === "all" ? (
              Object.entries(grouped).map(([category, catItems]) => (
                <div key={category} className="mb-6">
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <PantryItemCard key={item.id} item={item} onUpdate={load} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <PantryItemCard key={item.id} item={item} onUpdate={load} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
