import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
      } else {
        // Hydrate from DB to ensure session stays in sync with role updates
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub || token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.sub || token.id) as string;
        session.user.role = (token.role || "USER") as "USER" | "ARTIST" | "ADMIN";
      }
      return session;
    },
    async signIn({ user }) {
      if (user && user.email) {
        const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e !== "");

        if (bootstrapEmails.includes(user.email.toLowerCase())) {
          // Run on-demand database check/bootstrap
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser && dbUser.role === "USER") {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: "ADMIN" },
            });
            (user as any).role = "ADMIN";

            // Log administrative bootstrap event
            await prisma.auditLog.create({
              data: {
                action: "admin_role_bootstrap",
                entityType: "User",
                entityId: dbUser.id,
                metadataJson: { email: user.email },
              },
            });
          }
        }
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || "fcbc-core-super-secret-passphrase-at-least-32-chars",
});
