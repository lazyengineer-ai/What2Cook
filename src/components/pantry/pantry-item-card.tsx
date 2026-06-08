"use client";

import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { UNITS, formatQuantity } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";

interface PantryItemData {
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

interface PantryItemCardProps {
  item: PantryItemData;
  onUpdate: () => void;
}

export function PantryItemCard({ item, onUpdate }: PantryItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [expiryDate, setExpiryDate] = useState(
    item.expiryDate ? item.expiryDate.split("T")[0] : ""
  );
  const [photoUrl, setPhotoUrl] = useState(item.photoUrl ?? "");
  const [saving, setSaving] = useState(false);

  const isExpiring =
    item.expiryDate &&
    new Date(item.expiryDate) <= new Date(Date.now() + 3 * 86400000);

  async function save() {
    setSaving(true);
    await fetch(`/api/pantry/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseFloat(quantity),
        unit,
        expiryDate: expiryDate || null,
        photoUrl: photoUrl || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    onUpdate();
  }

  async function remove() {
    if (!confirm(`Remove ${item.ingredient.name} from pantry?`)) return;
    await fetch(`/api/pantry/${item.id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.photoUrl ? (
              <Image src={item.photoUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xl">
                {item.ingredient.category.icon}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.ingredient.name}</p>
              {isExpiring && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Expiring
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatQuantity(item.quantity, item.unit)} · {item.ingredient.category.name}
            </p>
            {item.expiryDate && (
              <p className="text-xs text-muted-foreground">
                Expires {format(new Date(item.expiryDate), "MMM d, yyyy")}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={remove}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {item.ingredient.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Photo</Label>
              <UploadButton
                endpoint="pantryImage"
                onClientUploadComplete={(res) => {
                  if (res?.[0]?.url) setPhotoUrl(res[0].url);
                }}
              />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
