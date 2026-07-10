"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import { revalidatePath } from "next/cache";

/**
 * Creates a basic, pending-verification artist profile for the authenticated user
 * and updates their system-level role to ARTIST.
 */
export async function registerArtistProfile(data: {
  displayName: string;
  slug: string;
  portfolioUrl?: string;
  externalProfileUrl?: string;
}) {
  try {
    // 1. Authenticate user session
    const user = await requireUser();

    const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!data.displayName.trim() || !cleanSlug) {
      return { success: false, error: "Display name and unique profile slug are required." };
    }

    // 2. Enforce slug uniqueness
    const slugExists = await prisma.artist.findFirst({
      where: { slug: cleanSlug },
    });
    if (slugExists) {
      return { success: false, error: `The custom style slug "${cleanSlug}" is already taken. Please try another.` };
    }

    // 3. Enforce 1-to-1 artist relation uniqueness
    const existingProfile = await prisma.artist.findFirst({
      where: { userId: user.id },
    });
    if (existingProfile) {
      return { success: false, error: "You already have an artist style profile associated with this account." };
    }

    // 4. Create the pending verification profile in the database
    const artist = await prisma.artist.create({
      data: {
        userId: user.id,
        displayName: data.displayName.trim(),
        slug: cleanSlug,
        type: "visual_artist",
        portfolioUrl: data.portfolioUrl?.trim() || null,
        externalProfileUrl: data.externalProfileUrl?.trim() || null,
        verificationStatus: "pending_verification",
        verificationRequestedAt: new Date(),
      },
    });

    // 5. Upgrade user's NextAuth role in PostgreSQL
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ARTIST" },
    });

    // 6. Write to security audit log
    await prisma.auditLog.create({
      data: {
        action: "artist_profile_registration",
        entityType: "Artist",
        entityId: artist.id,
        metadataJson: {
          displayName: artist.displayName,
          slug: artist.slug,
          userId: user.id,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/artist/dashboard");

    return { success: true, artistId: artist.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to complete artist profile registration" };
  }
}
