"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Copy, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Membership {
  householdId: string;
  name: string;
  role: "OWNER" | "MEMBER";
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "MEMBER";
}

interface HouseholdData {
  activeHouseholdId: string;
  memberships: Membership[];
  members: Member[];
  inviteCode: string | null;
  isOwner: boolean;
}

export function HouseholdSettings() {
  const router = useRouter();
  const { update } = useSession();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/household");
    if (res.ok) {
      setData(await res.json());
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSwitch(householdId: string) {
    if (!data || householdId === data.activeHouseholdId) return;
    setSwitching(true);
    setError("");

    const res = await fetch("/api/household/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });

    const result = await res.json();
    setSwitching(false);

    if (!res.ok) {
      setError(result.error ?? "Failed to switch household");
      return;
    }

    await update({ householdId });
    router.refresh();
    await load();
    setMessage(`Switched to ${result.name}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/household/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Failed to join household");
      return;
    }

    setJoinCode("");
    setMessage(`Joined ${result.name}`);
    await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newHouseholdName }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Failed to create household");
      return;
    }

    setNewHouseholdName("");
    await update({ householdId: result.id });
    router.refresh();
    await load();
    setMessage(`Created ${result.name}`);
  }

  async function handleCopyCode() {
    if (!data?.inviteCode) return;
    await navigator.clipboard.writeText(data.inviteCode);
    setMessage("Join code copied");
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "Regenerate the join code? The old code will stop working immediately."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/household/regenerate-code", { method: "POST" });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error ?? "Failed to regenerate code");
      return;
    }

    setMessage("Join code regenerated");
    await load();
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Household</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Household
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.memberships.length > 1 && (
          <div className="space-y-2">
            <Label>Active household</Label>
            <Select
              value={data.activeHouseholdId}
              onValueChange={handleSwitch}
              disabled={switching}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.memberships.map((m) => (
                  <SelectItem key={m.householdId} value={m.householdId}>
                    {m.name}
                    {m.role === "OWNER" ? " (owner)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {data.isOwner && data.inviteCode && (
          <div className="space-y-2">
            <Label>Join code</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={data.inviteCode}
                className="font-mono uppercase tracking-widest"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerate}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code so others can join your household.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Members</Label>
          <div className="space-y-2">
            {data.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{m.name ?? "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                  {m.role === "OWNER" ? "Owner" : "Member"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-2">
          <Label htmlFor="joinCode">Join a household</Label>
          <div className="flex gap-2">
            <Input
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code"
              className="font-mono uppercase tracking-widest"
              maxLength={10}
            />
            <Button type="submit" disabled={loading}>
              Join
            </Button>
          </div>
        </form>

        <form onSubmit={handleCreate} className="space-y-2">
          <Label htmlFor="newHousehold">Create new household</Label>
          <div className="flex gap-2">
            <Input
              id="newHousehold"
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
              placeholder="Household name"
            />
            <Button type="submit" variant="outline" disabled={loading}>
              Create
            </Button>
          </div>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}
      </CardContent>
    </Card>
  );
}
