import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import {
  pantryIntentsLlmSchema,
  pantryParseInputSchema,
} from "@/lib/ai/schemas";
import {
  resolvePantryIntents,
  summarizePantryIntents,
} from "@/lib/ai/pantry-intents";
import { PANTRY_PARSE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import {
  estimateCostCents,
  getOpenAI,
  isAiConfigured,
  MODEL_TEXT,
} from "@/lib/openai";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = pantryParseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "PANTRY_TEXT");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL_TEXT,
      messages: [
        { role: "system", content: PANTRY_PARSE_SYSTEM_PROMPT },
        { role: "user", content: parsed.data.text },
      ],
      response_format: { type: "json_object" },
    });

    const tokensIn = completion.usage?.prompt_tokens ?? 0;
    const tokensOut = completion.usage?.completion_tokens ?? 0;
    await logUsage(user.householdId, "PANTRY_TEXT", {
      tokensIn,
      tokensOut,
      estimatedCostCents: estimateCostCents(tokensIn, tokensOut),
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const llmParsed = pantryIntentsLlmSchema.parse(JSON.parse(content));
    const intents = await resolvePantryIntents(user.householdId, llmParsed.intents);

    return NextResponse.json({
      intents,
      summary: summarizePantryIntents(intents),
      transcript: parsed.data.text,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse pantry command" },
      { status: 500 }
    );
  }
}
