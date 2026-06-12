import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import {
  checkQuota,
  logUsage,
  quotaExceededMessage,
} from "@/lib/ai/quota";
import { getOpenAI, isAiConfigured, MODEL_TRANSCRIBE } from "@/lib/openai";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI not configured. Set OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const quota = await checkQuota(user.householdId, "PANTRY_VOICE");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quotaExceededMessage(quota) },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file required" }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file too large (max 25MB)" }, { status: 400 });
  }

  try {
    const transcription = await getOpenAI().audio.transcriptions.create({
      file,
      model: MODEL_TRANSCRIBE,
    });

    await logUsage(user.householdId, "PANTRY_VOICE", {
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostCents: 1,
    });

    return NextResponse.json({ text: transcription.text });
  } catch {
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
