import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { expandToRecipeDraft } from "@/lib/ai/recipe-expansion";
import { recipeDraftInputSchema } from "@/lib/ai/schemas";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import { estimateCostCents, isAiConfigured } from "@/lib/openai";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = recipeDraftInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "RECIPE_DRAFT");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  try {
    const { draft, unresolved, usage } = await expandToRecipeDraft(
      user.householdId,
      parsed.data.prompt,
      {
        servings: parsed.data.servings,
        preferences: parsed.data.preferences,
      }
    );

    await logUsage(user.householdId, "RECIPE_DRAFT", {
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      estimatedCostCents: estimateCostCents(usage.tokensIn, usage.tokensOut),
    });

    return NextResponse.json({
      draft,
      unresolvedIngredients: unresolved,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate recipe draft" },
      { status: 500 }
    );
  }
}
