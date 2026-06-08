import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.pantryItem.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.pantryItem.update({
    where: { id },
    data: {
      ...(body.quantity !== undefined && { quantity: body.quantity }),
      ...(body.unit && { unit: body.unit }),
      ...(body.expiryDate !== undefined && {
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
      ...(body.lowStockThreshold !== undefined && {
        lowStockThreshold: body.lowStockThreshold,
      }),
      lastUpdated: new Date(),
    },
    include: { ingredient: { include: { category: true } } },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await prisma.pantryItem.findFirst({
    where: { id, householdId: user.householdId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.pantryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
