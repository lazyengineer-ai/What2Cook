import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.ingredientCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}
