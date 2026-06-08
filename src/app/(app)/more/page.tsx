"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import { AppHeader } from "@/components/layout/app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LogOut, Receipt, Settings, TrendingUp } from "lucide-react";
import { DAY_NAMES, formatQuantity } from "@/lib/utils";
import { DIETARY_RULE_LABELS } from "@/lib/dietary";
import { UploadButton } from "@/lib/uploadthing";
import type { DietaryRule } from "@prisma/client";

const DIETARY_RULES = Object.keys(DIETARY_RULE_LABELS) as DietaryRule[];

interface Constraint {
  id: string;
  dayOfWeek: number;
  rule: DietaryRule;
}

interface Forecast {
  ingredientId: string;
  name: string;
  unit: string;
  categoryName: string;
  avgWeeklyUsage: number;
  currentStock: number;
  weeksRemaining: number | null;
  suggestedBuy: number;
  isLowStock: boolean;
}

interface Purchase {
  id: string;
  store: string | null;
  date: string;
  total: number;
  receiptUrl: string | null;
}

export default function MorePage() {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, number>>({});
  const [totalSpent, setTotalSpent] = useState(0);
  const [newDay, setNewDay] = useState("1");
  const [newRule, setNewRule] = useState<DietaryRule>("VEGETARIAN");
  const [expenseStore, setExpenseStore] = useState("");
  const [expenseTotal, setExpenseTotal] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [receiptUrl, setReceiptUrl] = useState("");

  const loadConstraints = useCallback(async () => {
    const res = await fetch("/api/constraints");
    setConstraints(await res.json());
  }, []);

  const loadForecast = useCallback(async () => {
    const res = await fetch("/api/forecast");
    const data = await res.json();
    setForecasts(data.forecasts ?? []);
  }, []);

  const loadExpenses = useCallback(async () => {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setPurchases(data.purchases ?? []);
    setByCategory(data.byCategory ?? {});
    setTotalSpent(data.totalSpent ?? 0);
  }, []);

  useEffect(() => {
    loadConstraints();
    loadForecast();
    loadExpenses();
  }, [loadConstraints, loadForecast, loadExpenses]);

  async function addConstraint() {
    await fetch("/api/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: parseInt(newDay),
        rule: newRule,
      }),
    });
    loadConstraints();
  }

  async function removeConstraint(id: string) {
    await fetch(`/api/constraints?id=${id}`, { method: "DELETE" });
    loadConstraints();
  }

  async function addExpense() {
    if (!expenseTotal) return;
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store: expenseStore || undefined,
        date: expenseDate,
        total: parseFloat(expenseTotal),
        receiptUrl: receiptUrl || null,
      }),
    });
    setExpenseStore("");
    setExpenseTotal("");
    setReceiptUrl("");
    loadExpenses();
  }

  return (
    <>
      <AppHeader title="More" />
      <div className="mx-auto max-w-lg p-4 pb-8">
        <Tabs defaultValue="settings">
          <TabsList className="mb-4">
            <TabsTrigger value="settings">
              <Settings className="mr-1 h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="forecast">
              <TrendingUp className="mr-1 h-4 w-4" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="mr-1 h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm">Dark / Light mode</span>
                <ThemeToggle />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly dietary rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Day</Label>
                    <Select value={newDay} onValueChange={setNewDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((day, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rule</Label>
                    <Select
                      value={newRule}
                      onValueChange={(v) => setNewRule(v as DietaryRule)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIETARY_RULES.map((rule) => (
                          <SelectItem key={rule} value={rule}>
                            {DIETARY_RULE_LABELS[rule]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={addConstraint}>
                  Add rule
                </Button>

                <div className="space-y-2">
                  {constraints.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm">
                        {DAY_NAMES[c.dayOfWeek]} — {DIETARY_RULE_LABELS[c.rule]}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConstraint(c.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {constraints.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No dietary rules set. E.g. Mon/Wed/Fri = Vegetarian.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Based on your cooking history over the last 8 weeks.
            </p>
            {forecasts.filter((f) => f.isLowStock).length > 0 && (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Low stock alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {forecasts
                    .filter((f) => f.isLowStock)
                    .map((f) => (
                      <div key={f.ingredientId} className="flex justify-between text-sm">
                        <span>{f.name}</span>
                        <Badge variant="warning">
                          {formatQuantity(f.currentStock, f.unit)} left
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
            {forecasts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Cook some recipes to build usage forecasts.
              </p>
            ) : (
              forecasts.map((f) => (
                <Card key={f.ingredientId}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.categoryName} · ~{f.avgWeeklyUsage} {f.unit}/week
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatQuantity(f.currentStock, f.unit)}
                      </p>
                      {f.suggestedBuy > 0 && (
                        <p className="text-xs text-primary">
                          Buy ~{f.suggestedBuy} {f.unit}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add receipt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Receipt photo</Label>
                  <UploadButton
                    endpoint="receiptImage"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) setReceiptUrl(res[0].url);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store</Label>
                  <Input
                    value={expenseStore}
                    onChange={(e) => setExpenseStore(e.target.value)}
                    placeholder="Grocery store name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total ($)</Label>
                    <Input
                      type="number"
                      value={expenseTotal}
                      onChange={(e) => setExpenseTotal(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={addExpense}>
                  Save expense
                </Button>
              </CardContent>
            </Card>

            {totalSpent > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Total spent: ${totalSpent.toFixed(2)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(byCategory).map(([cat, amount]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span>{cat}</span>
                        <span>${amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {purchases.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{p.store ?? "Grocery run"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-semibold">${p.total.toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
