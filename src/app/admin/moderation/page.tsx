import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security";
import ModerationWorkspace from "./ModerationWorkspace";

export const revalidate = 0; // Ensure fresh database loads

export default async function AdminModerationPage() {
  // Enforce secure administrative role check
  await requireAdmin();

  // Query submissions with related daily themes, submitters, and historic attempts
  const submissions = await prisma.themeSubmission.findMany({
    include: {
      dailyTheme: {
        select: {
          id: true,
          themeText: true,
          description: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      validationAttempts: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Render Client Workspace with initial query data
  return <ModerationWorkspace initialSubmissions={submissions} />;
}
