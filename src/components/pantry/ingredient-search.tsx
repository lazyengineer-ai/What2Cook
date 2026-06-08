"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNITS } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  defaultUnit: string;
  category: Category;
}

interface IngredientSearchProps {
  onSelect: (ingredient: Ingredient) => void;
  placeholder?: string;
}

export function IngredientSearch({
  onSelect,
  placeholder = "Search ingredients...",
}: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Ingredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newUnit, setNewUnit] = useState("pieces");
  const [creating, setCreating] = useState(false);

  const search = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/ingredients?q=${encodeURIComponent(q)}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  async function createIngredient() {
    if (!newName || !newCategoryId) return;
    setCreating(true);
    const res = await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        categoryId: newCategoryId,
        defaultUnit: newUnit,
      }),
    });
    const ingredient = await res.json();
    setCreating(false);
    setOpen(false);
    setNewName("");
    onSelect(ingredient);
    setQuery("");
    setResults([]);
  }

  const showResults = query.length >= 1;

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {showResults && (
        <div className="mt-2 overflow-hidden rounded-md border bg-popover shadow-sm">
          {searching ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            <ul className="max-h-48 divide-y overflow-y-auto">
              {results.map((ing) => (
                <li key={ing.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm hover:bg-accent touch-target"
                    onClick={() => {
                      onSelect(ing);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <span>{ing.category.icon}</span>
                    <span className="font-medium">{ing.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {ing.category.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3">
              <p className="text-sm text-muted-foreground">No ingredients found</p>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setNewName(query)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add &quot;{query}&quot; as new ingredient
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add custom ingredient</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default unit</Label>
                      <Select value={newUnit} onValueChange={setNewUnit}>
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
                    <Button
                      className="w-full"
                      onClick={createIngredient}
                      disabled={creating || !newName || !newCategoryId}
                    >
                      {creating ? "Creating..." : "Create ingredient"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
