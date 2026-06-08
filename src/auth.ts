import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-utils";

async function resolveLoginHouseholdId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      activeHousehold: true,
      memberships: { include: { household: true }, orderBy: { joinedAt: "asc" } },
    },
  });

  if (!user || user.memberships.length === 0) return null;

  if (
    user.activeHouseholdId &&
    user.memberships.some((m) => m.householdId === user.activeHouseholdId)
  ) {
    return user.activeHouseholdId;
  }

  const first = user.memberships[0];
  await prisma.user.update({
    where: { id: userId },
    data: { activeHouseholdId: first.householdId },
  });
  return first.householdId;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const valid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        const householdId = await resolveLoginHouseholdId(user.id);
        if (!householdId) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          householdId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.householdId = (user as { householdId?: string }).householdId;
      }
      if (trigger === "update" && session?.householdId && token.id) {
        const membership = await prisma.householdMember.findUnique({
          where: {
            userId_householdId: {
              userId: token.id as string,
              householdId: session.householdId as string,
            },
          },
        });
        if (membership) {
          token.householdId = session.householdId as string;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.householdId = token.householdId as string;
      }
      return session;
    },
  },
});
