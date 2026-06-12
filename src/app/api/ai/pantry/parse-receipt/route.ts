import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { receiptParseInputSchema, receiptParseLlmSchema } from "@/lib/ai/schemas";
import {
  isAllowedReceiptUrl,
  resolvePantryIntents,
  summarizePantryIntents,
} from "@/lib/ai/pantry-intents";
import { RECEIPT_PARSE_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import {
  estimateCostCents,
  getOpenAI,
  isAiConfigured,
  MODEL_VISION,
} from "@/lib/openai";

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const parsed = receiptParseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!isAllowedReceiptUrl(parsed.data.imageUrl)) {
    return NextResponse.json({ error: "Invalid receipt image URL" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "RECEIPT_OCR");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: MODEL_VISION,
      messages: [
        { role: "system", content: RECEIPT_PARSE_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract grocery items from this receipt." },
            { type: "image_url", image_url: { url: parsed.data.imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const tokensIn = completion.usage?.prompt_tokens ?? 0;
    const tokensOut = completion.usage?.completion_tokens ?? 0;
    await logUsage(user.householdId, "RECEIPT_OCR", {
      tokensIn,
      tokensOut,
      estimatedCostCents: estimateCostCents(tokensIn, tokensOut),
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const llmParsed = receiptParseLlmSchema.parse(JSON.parse(content));
    const intents = await resolvePantryIntents(user.householdId, llmParsed.intents);

    return NextResponse.json({
      intents,
      store: llmParsed.store,
      total: llmParsed.total,
      date: llmParsed.date,
      summary: summarizePantryIntents(intents),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse receipt" },
      { status: 500 }
    );
  }
}
