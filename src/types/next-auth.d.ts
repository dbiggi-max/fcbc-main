import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ARTIST" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: "USER" | "ARTIST" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "ARTIST" | "ADMIN";
  }
}
