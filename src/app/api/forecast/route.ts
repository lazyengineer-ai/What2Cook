import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth-utils";
import { getUsageForecasts, getExpiringItems } from "@/lib/usage-forecast";

export async function GET() {
  const user = await requireUserApi();
  if (user instanceof NextResponse) return user;

  const [forecasts, expiring] = await Promise.all([
    getUsageForecasts(user.householdId),
    getExpiringItems(user.householdId),
  ]);

  return NextResponse.json({ forecasts, expiring });
}
