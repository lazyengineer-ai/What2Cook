import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Household, HouseholdMember, User } from "@prisma/client";

export type SessionUser = User & {
  householdId: string;
  household: Household;
  memberships: (HouseholdMember & { household: Household })[];
};

async function resolveActiveHousehold(user: User & {
  activeHousehold: Household | null;
  memberships: (HouseholdMember & { household: Household })[];
}): Promise<{ householdId: string; household: Household } | null> {
  if (user.activeHouseholdId && user.activeHousehold) {
    const isMember = user.memberships.some(
      (m) => m.householdId === user.activeHouseholdId
    );
    if (isMember) {
      return { householdId: user.activeHouseholdId, household: user.activeHousehold };
    }
  }

  const first = user.memberships[0];
  if (!first) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { activeHouseholdId: first.householdId },
  });

  return { householdId: first.householdId, household: first.household };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      activeHousehold: true,
      memberships: { include: { household: true }, orderBy: { joinedAt: "asc" } },
    },
  });

  if (!user) return null;

  const active = await resolveActiveHousehold(user);
  if (!active) return null;

  return {
    ...user,
    householdId: active.householdId,
    household: active.household,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in API route handlers — returns 401 JSON instead of redirecting. */
export async function requireUserApi(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export async function requireMembership(userId: string, householdId: string) {
  return prisma.householdMember.findUnique({
    where: { userId_householdId: { userId, householdId } },
  });
}

export async function requireOwner(userId: string, householdId: string) {
  const membership = await requireMembership(userId, householdId);
  return membership?.role === "OWNER" ? membership : null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
