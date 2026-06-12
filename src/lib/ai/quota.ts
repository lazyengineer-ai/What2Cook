import { prisma } from "@/lib/db";

/** Lean-budget monthly caps per household. */
export const AI_QUOTAS = {
  SUGGEST: 60,
  RECIPE_DRAFT: 10,
  PANTRY_TEXT: 30,
  PANTRY_VOICE: 15,
  RECEIPT_OCR: 5,
} as const;

export type AiFeature = keyof typeof AI_QUOTAS;

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  cap: number;
  feature: AiFeature;
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Check whether the household has remaining quota for an AI feature
 * this calendar month. Call BEFORE every OpenAI request.
 */
export async function checkQuota(
  householdId: string,
  feature: AiFeature
): Promise<QuotaStatus> {
  const cap = AI_QUOTAS[feature];
  const used = await prisma.aiUsageLog.count({
    where: {
      householdId,
      feature,
      createdAt: { gte: monthStart() },
    },
  });
  return { allowed: used < cap, used, cap, feature };
}

/** Friendly message routes should return (with status 429) when quota is exhausted. */
export function quotaExceededMessage(status: QuotaStatus): string {
  return `Monthly AI limit reached for this feature (${status.used}/${status.cap}). Resets next month.`;
}

/**
 * Record usage after a successful OpenAI call.
 * Call AFTER every OpenAI request.
 */
export async function logUsage(
  householdId: string,
  feature: AiFeature,
  usage: { tokensIn?: number; tokensOut?: number; estimatedCostCents?: number } = {}
): Promise<void> {
  await prisma.aiUsageLog.create({
    data: {
      householdId,
      feature,
      tokensIn: usage.tokensIn ?? 0,
      tokensOut: usage.tokensOut ?? 0,
      estimatedCostCents: usage.estimatedCostCents ?? 0,
    },
  });
}
