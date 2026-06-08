"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { IngredientSearch } from "@/components/pantry/ingredient-search";
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
import { UNITS } from "@/lib/utils";

interface AddGroceryItemDialogProps {
  weekStart: string;
  onAdded: () => void;
}

export function AddGroceryItemDialog({
  weekStart,
  onAdded,
}: AddGroceryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{
    id: string;
    name: string;
    defaultUnit: string;
  } | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pieces");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!selectedIngredient) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/grocery/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        ingredientId: selectedIngredient.id,
        quantity: parseFloat(quantity),
        unit,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add item");
      return;
    }

    setOpen(false);
    setSelectedIngredient(null);
    setQuantity("1");
    setUnit("pieces");
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add grocery item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <IngredientSearch
            onSelect={(ing) => {
              setSelectedIngredient(ing);
              setUnit(ing.defaultUnit);
            }}
            placeholder="Search ingredients..."
          />
          {selectedIngredient && (
            <>
              <p className="text-sm font-medium">Selected: {selectedIngredient.name}</p>
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
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full"
                onClick={handleAdd}
                disabled={saving || !quantity}
              >
                {saving ? "Adding..." : "Add to list"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
