"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mic,
  Minus,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ResolvedPantryIntent } from "@/lib/ai/schemas";
import { formatDateOnly } from "@/lib/utils";

interface PantryAssistantProps {
  onApplied: () => void;
}

export function PantryAssistant({ onApplied }: PantryAssistantProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [intents, setIntents] = useState<ResolvedPantryIntent[]>([]);
  const [summary, setSummary] = useState("");
  const [store, setStore] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [receiptDate, setReceiptDate] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [saveAsExpense, setSaveAsExpense] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const voiceSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  function resetPreview() {
    setIntents([]);
    setSummary("");
    setStore(null);
    setTotal(null);
    setReceiptDate(null);
    setReceiptUrl(null);
    setSaveAsExpense(false);
    setExpenseTotal("");
    setSuccess("");
    setError("");
  }

  async function parseText(input: string) {
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to parse.");
      return;
    }

    setParsing(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/ai/pantry/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to parse");
      setParsing(false);
      return;
    }

    setIntents(json.intents ?? []);
    setSummary(json.summary ?? "");
    setParsing(false);
  }

  async function parseReceipt(imageUrl: string) {
    setParsing(true);
    setError("");
    setSuccess("");
    resetPreview();
    setReceiptUrl(imageUrl);

    const res = await fetch("/api/ai/pantry/parse-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to parse receipt");
      setParsing(false);
      return;
    }

    setIntents(json.intents ?? []);
    setSummary(json.summary ?? "");
    setStore(json.store ?? null);
    setTotal(json.total ?? null);
    setReceiptDate(json.date ?? null);
    if (json.total != null) setExpenseTotal(String(json.total));
    setParsing(false);
  }

  async function transcribeAndParse(blob: Blob) {
    setParsing(true);
    setError("");

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    const res = await fetch("/api/ai/pantry/transcribe", {
      method: "POST",
      body: formData,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to transcribe");
      setParsing(false);
      return;
    }

    const transcript = json.text ?? "";
    setText(transcript);
    await parseText(transcript);
  }

  async function startRecording() {
    if (!voiceSupported) return;
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        void transcribeAndParse(blob);
      };

      recorder.start();
      setRecording(true);
      recordTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      }, 30000);
    } catch {
      setError("Microphone permission denied or unavailable.");
    }
  }

  function stopRecording() {
    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  function isConfirmable(intent: ResolvedPantryIntent): boolean {
    if (intent.action === "add") return true;
    return intent.existingPantryItemId != null;
  }

  const confirmableIntents = intents.filter(isConfirmable);

  async function confirm() {
    if (confirmableIntents.length === 0) {
      setError("No valid changes to apply.");
      return;
    }

    setConfirming(true);
    setError("");
    setSuccess("");

    const expense =
      saveAsExpense && expenseTotal
        ? {
            store: store ?? undefined,
            date: receiptDate ?? formatDateOnly(new Date()),
            total: parseFloat(expenseTotal),
            receiptUrl,
          }
        : undefined;

    const res = await fetch("/api/ai/pantry/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intents: confirmableIntents, expense }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed to apply changes");
      setConfirming(false);
      return;
    }

    const skipped = (json.skipped as string[] | undefined) ?? [];
    setSuccess(
      `Applied ${json.applied ?? 0} change${json.applied === 1 ? "" : "s"}` +
        (skipped.length ? ` (${skipped.length} skipped)` : "") +
        "."
    );
    resetPreview();
    setText("");
    setConfirming(false);
    onApplied();
  }

  function actionIcon(action: ResolvedPantryIntent["action"]) {
    if (action === "add") return <Plus className="h-3.5 w-3.5" />;
    if (action === "remove") return <Minus className="h-3.5 w-3.5" />;
    return <Pencil className="h-3.5 w-3.5" />;
  }

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Pantry Assistant
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <CardContent className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="pantry-command">Type a command</Label>
            <textarea
              id="pantry-command"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "add 2 lbs chicken, remove expired milk"'
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={1000}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => parseText(text)} disabled={parsing || recording}>
              {parsing ? "Parsing..." : "Parse"}
            </Button>
            {voiceSupported && (
              <Button
                type="button"
                variant="outline"
                onClick={recording ? stopRecording : startRecording}
                disabled={parsing}
              >
                <Mic className="mr-1 h-4 w-4" />
                {recording ? "Stop" : "Voice"}
              </Button>
            )}
            <UploadButton
              endpoint="receiptImage"
              onClientUploadComplete={(files) => {
                const url = files[0]?.url;
                if (url) void parseReceipt(url);
              }}
              onUploadError={(err) => setError(err.message)}
              appearance={{
                button:
                  "bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 text-sm font-medium rounded-md",
                allowedContent: "hidden",
              }}
              content={{ button: "Receipt" }}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          )}

          {intents.length > 0 && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">{summary}</p>
              {(store || total != null || receiptDate) && (
                <p className="text-xs text-muted-foreground">
                  {[store, total != null ? `$${total}` : null, receiptDate]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              <ul className="space-y-2">
                {intents.map((intent, i) => {
                  const invalid = !isConfirmable(intent);
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-2 text-sm ${invalid ? "opacity-50 line-through" : ""}`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                        {actionIcon(intent.action)}
                      </span>
                      <span className="flex-1">
                        {intent.ingredientName}
                        {intent.quantity != null && intent.unit && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {intent.quantity} {intent.unit}
                          </span>
                        )}
                      </span>
                      {intent.willCreate && (
                        <Badge variant="outline">new ingredient</Badge>
                      )}
                      {invalid && intent.action !== "add" && (
                        <Badge variant="warning">not in pantry</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>

              {receiptUrl && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-expense"
                    checked={saveAsExpense}
                    onCheckedChange={(v) => setSaveAsExpense(v === true)}
                  />
                  <Label htmlFor="save-expense" className="text-sm font-normal">
                    Also save as expense
                  </Label>
                </div>
              )}
              {saveAsExpense && (
                <div className="space-y-2">
                  <Label htmlFor="expense-total">Total ($)</Label>
                  <Input
                    id="expense-total"
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseTotal}
                    onChange={(e) => setExpenseTotal(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={confirm}
                  disabled={confirming || confirmableIntents.length === 0}
                >
                  {confirming ? "Applying..." : "Confirm"}
                </Button>
                <Button variant="outline" onClick={resetPreview} disabled={confirming}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
