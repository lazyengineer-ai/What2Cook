import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.groceryListItem.findFirst({
    where: { id },
    include: { groceryList: true },
  });

  if (!item || item.groceryList.householdId !== user.householdId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.source !== "MANUAL") {
    return NextResponse.json(
      { error: "Only manually added items can be deleted" },
      { status: 400 }
    );
  }

  await prisma.groceryListItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
