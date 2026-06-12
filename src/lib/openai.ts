import OpenAI from "openai";

export const MODEL_TEXT = "gpt-4o-mini";
export const MODEL_VISION = "gpt-4o-mini";
export const MODEL_TRANSCRIBE = "whisper-1";

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Rough cost estimate in cents for gpt-4o-mini usage, used for AiUsageLog.
 * Input ~$0.15/1M tokens, output ~$0.60/1M tokens.
 */
export function estimateCostCents(tokensIn: number, tokensOut: number): number {
  const dollars = (tokensIn * 0.15 + tokensOut * 0.6) / 1_000_000;
  return Math.ceil(dollars * 100);
}
