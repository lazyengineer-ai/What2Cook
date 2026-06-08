import { BottomNav } from "@/components/layout/bottom-nav";
import { requireUser } from "@/lib/auth-utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
