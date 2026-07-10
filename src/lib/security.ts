import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Ensures the user is logged in, returning the session user.
 * Redirects to Google login if unauthenticated.
 */
export async function requireUser() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }
  return session.user;
}

/**
 * Ensures the user has the ADMIN role.
 * Throws a forbidden error or redirects if unauthorized.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "ADMIN") {
    redirect("/admin/login?error=UnauthorizedAdminRequired");
  }
  return session.user;
}

/**
 * Ensures the user has either the ARTIST or ADMIN role.
 */
export async function requireArtistOrAdmin() {
  const session = await auth();
  if (!session || !session.user || (session.user.role !== "ARTIST" && session.user.role !== "ADMIN")) {
    redirect("/dashboard?error=UnauthorizedArtistOrAdminRequired");
  }
  return session.user;
}

/**
 * Asserts that the authenticated user is either the author of the submission
 * or has the ADMIN role. Throws if unauthorized.
 */
export async function assertSubmissionOwnerOrAdmin(submissionId: string) {
  const user = await requireUser();
  if (user.role === "ADMIN") return;

  const submission = await prisma.themeSubmission.findUnique({
    where: { id: submissionId },
    select: { userId: true },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  if (submission.userId !== user.id) {
    throw new Error("Access Denied: You do not own this submission.");
  }
}

/**
 * Asserts that the authenticated user is either the owner of the artist style profile
 * or has the ADMIN role. Throws if unauthorized.
 */
export async function assertArtistOwnerOrAdmin(artistId: string) {
  const user = await requireUser();
  if (user.role === "ADMIN") return;

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { userId: true },
  });

  if (!artist) {
    throw new Error("Artist profile not found");
  }

  if (artist.userId !== user.id) {
    throw new Error("Access Denied: You do not own this artist profile.");
  }
}
