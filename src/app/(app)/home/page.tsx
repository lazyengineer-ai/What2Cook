import { requireUser } from "@/lib/auth-utils";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function HomePage() {
  const user = await requireUser();

  return <DashboardClient householdName={user.household.name} />;
}
