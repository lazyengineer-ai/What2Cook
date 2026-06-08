/**
 * One-time migration for existing databases that used User.householdId.
 * Run: npx tsx prisma/migrate-households.ts
 * Then: npm run db:push
 */
import { PrismaClient } from "@prisma/client";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  const prisma = new PrismaClient();

  const hasOldColumn = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'householdId'
  `;

  if (hasOldColumn.length === 0) {
    console.log("No householdId column — migration already applied or fresh install.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$executeRaw`
    CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER')
  `.catch(() => {});

  await prisma.$executeRaw`
    ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT
  `;

  await prisma.$executeRaw`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeHouseholdId" TEXT
  `;

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "HouseholdMember" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "householdId" TEXT NOT NULL,
      "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
    )
  `;

  const households = await prisma.$queryRaw<{ id: string; inviteCode: string | null }[]>`
    SELECT id, "inviteCode" FROM "Household"
  `;

  const existingCodes = new Set(
    households.map((h) => h.inviteCode).filter(Boolean) as string[]
  );

  for (const household of households) {
    if (household.inviteCode) continue;
    let code = generateInviteCode();
    while (existingCodes.has(code)) {
      code = generateInviteCode();
    }
    existingCodes.add(code);
    await prisma.$executeRaw`
      UPDATE "Household" SET "inviteCode" = ${code} WHERE id = ${household.id}
    `;
  }

  const users = await prisma.$queryRaw<
    { id: string; householdId: string }[]
  >`SELECT id, "householdId" FROM "User"`;

  for (const user of users) {
    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "HouseholdMember"
      WHERE "userId" = ${user.id} AND "householdId" = ${user.householdId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO "HouseholdMember" (id, "userId", "householdId", role, "joinedAt")
        VALUES (${cuid()}, ${user.id}, ${user.householdId}, 'OWNER', NOW())
      `;
    }

    await prisma.$executeRaw`
      UPDATE "User" SET "activeHouseholdId" = ${user.householdId} WHERE id = ${user.id}
    `;
  }

  await prisma.$executeRaw`
    ALTER TABLE "Household" ALTER COLUMN "inviteCode" SET NOT NULL
  `.catch(() => {});

  await prisma.$executeRaw`
    ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_householdId_fkey"
  `;
  await prisma.$executeRaw`
    ALTER TABLE "User" DROP COLUMN "householdId"
  `;

  console.log(`Migrated ${users.length} users across ${households.length} households.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
