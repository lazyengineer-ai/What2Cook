import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth-utils";
import { registerSchema } from "@/lib/validations";
import { generateUniqueInviteCode, normalizeInviteCode } from "@/lib/household-code";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    if (parsed.data.mode === "join") {
      const inviteCode = normalizeInviteCode(parsed.data.inviteCode);
      const household = await prisma.household.findUnique({
        where: { inviteCode },
      });

      if (!household) {
        return NextResponse.json({ error: "Invalid join code" }, { status: 400 });
      }

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            activeHouseholdId: household.id,
          },
        });

        await tx.householdMember.create({
          data: {
            userId: created.id,
            householdId: household.id,
            role: "MEMBER",
          },
        });

        return created;
      });

      return NextResponse.json({ id: user.id, email: user.email });
    }

    const inviteCode = await generateUniqueInviteCode(async (code) => {
      const existingCode = await prisma.household.findUnique({
        where: { inviteCode: code },
      });
      return !!existingCode;
    });

    const createData = parsed.data;

    const user = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { name: createData.householdName, inviteCode },
      });

      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          activeHouseholdId: household.id,
        },
      });

      await tx.householdMember.create({
        data: {
          userId: created.id,
          householdId: household.id,
          role: "OWNER",
        },
      });

      return created;
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
