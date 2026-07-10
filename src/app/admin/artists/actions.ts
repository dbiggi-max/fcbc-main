"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import { revalidatePath } from "next/cache";

/**
 * Approves a pending artist's registration request, enabling their style profile
 * to be utilized in consensual dataset ingestion and generation loops.
 */
export async function approveArtistProfile(artistId: string) {
  try {
    const admin = await requireAdmin();

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
        verifiedByAdminId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "artist_profile_approve",
        entityType: "Artist",
        entityId: artistId,
        metadataJson: {
          adminId: admin.id,
          adminEmail: admin.email,
          artistSlug: artist.slug,
        },
      },
    });

    revalidatePath("/admin/artists");
    revalidatePath("/artist/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve artist style profile." };
  }
}

/**
 * Rejects or revokes an artist's registration request.
 */
export async function rejectArtistProfile(artistId: string) {
  try {
    const admin = await requireAdmin();

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        verificationStatus: "REJECTED",
        verifiedAt: null,
        verifiedByAdminId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "artist_profile_reject",
        entityType: "Artist",
        entityId: artistId,
        metadataJson: {
          adminId: admin.id,
          adminEmail: admin.email,
          artistSlug: artist.slug,
        },
      },
    });

    revalidatePath("/admin/artists");
    revalidatePath("/artist/dashboard");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject artist style profile." };
  }
}
