"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RegisterMode = "create" | "join";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<RegisterMode>("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdPreview, setHouseholdPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setMode("join");
      setInviteCode(code.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "join" || inviteCode.length < 4) {
      setHouseholdPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/household/validate-code?code=${encodeURIComponent(inviteCode)}`
      );
      if (res.ok) {
        const data = await res.json();
        setHouseholdPreview(data.householdName);
      } else {
        setHouseholdPreview(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteCode, mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body =
      mode === "create"
        ? { mode: "create" as const, name, email, password, householdName }
        : { mode: "join" as const, name, email, password, inviteCode };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ChefHat className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">What2Cook</h1>
        <p className="text-sm text-muted-foreground">Set up your household kitchen</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start a new household or join with a code</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as RegisterMode)}
            className="mb-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create household</TabsTrigger>
              <TabsTrigger value="join">Join with code</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TabsContent value="create" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="householdName">Household name</Label>
                  <Input
                    id="householdName"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="The Smith Kitchen"
                    required={mode === "create"}
                  />
                </div>
              </TabsContent>

              <TabsContent value="join" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Join code</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="K7X2M9"
                    className="font-mono uppercase tracking-widest"
                    required={mode === "join"}
                    maxLength={10}
                  />
                  {householdPreview && (
                    <p className="text-sm text-muted-foreground">
                      Joining: <span className="font-medium">{householdPreview}</span>
                    </p>
                  )}
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>
            </form>
          </Tabs>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
