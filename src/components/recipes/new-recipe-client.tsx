"use client";

import { useEffect, useState } from "react";
import {
  RecipeForm,
  type RecipeFormInitialData,
} from "@/components/recipes/recipe-form";
import { RecipeAiPanel } from "@/components/ai/recipe-ai-panel";

const STORAGE_KEY = "recipe-ai-draft";

export function NewRecipeClient() {
  const [draft, setDraft] = useState<RecipeFormInitialData | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    sessionStorage.removeItem(STORAGE_KEY);
    try {
      const parsed = JSON.parse(stored) as RecipeFormInitialData;
      setDraft(parsed);
      setDraftKey((k) => k + 1);
    } catch {
      // ignore invalid handoff
    }
  }, []);

  function applyDraft(next: RecipeFormInitialData) {
    setDraft(next);
    setDraftKey((k) => k + 1);
  }

  return (
    <>
      <RecipeAiPanel onUseDraft={applyDraft} />
      <RecipeForm
        mode="create"
        initialData={draft ?? undefined}
        key={draftKey}
      />
    </>
  );
}
