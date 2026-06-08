import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { getUsageForecasts, getExpiringItems } from "@/lib/usage-forecast";

export async function GET() {
  const user = await requireUser();

  const [forecasts, expiring] = await Promise.all([
    getUsageForecasts(user.householdId),
    getExpiringItems(user.householdId),
  ]);

  return NextResponse.json({ forecasts, expiring });
}
