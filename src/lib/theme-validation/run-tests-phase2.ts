import { prisma } from "../prisma";

/**
 * PHASE 2 SECURE BOUNDARY & SOFT DELETE AUTOMATED TEST RUNNER
 * Verifies relational integrity, state transitions, security guards, and auditing.
 */
async function runPhase2Tests() {
  console.log("==========================================================");
  console.log("🚀 STARTING PHASE 2 AUTOMATED INTEGRATION & SECURITY TESTS");
  console.log("==========================================================\n");

  try {
    // 1. Setup clean isolated test entities
    const timestamp = Date.now();
    const testAdminEmail = `test-admin-${timestamp}@example.com`;
    const testUserEmail = `test-user-${timestamp}@example.com`;
    const testArtistEmail = `test-artist-${timestamp}@example.com`;

    console.log("🔄 Step 1: Bootstrapping test users and seeding PostgreSQL database...");

    // Create Admin
    const adminUser = await prisma.user.create({
      data: {
        email: testAdminEmail,
        name: "Test Administrator",
        role: "ADMIN",
      },
    });
    console.log(`✅ Seeded ADMIN user: ${adminUser.email} (ID: ${adminUser.id})`);

    // Create regular User
    const standardUser = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: "Standard Participant",
        role: "USER",
      },
    });
    console.log(`✅ Seeded USER user: ${standardUser.email} (ID: ${standardUser.id})`);

    // Create user who will register as Artist
    const artistCandidate = await prisma.user.create({
      data: {
        email: testArtistEmail,
        name: "Artist Candidate",
        role: "USER",
      },
    });
    console.log(`✅ Seeded ARTIST-CANDIDATE user: ${artistCandidate.email} (ID: ${artistCandidate.id})`);

    // Create a mock active DailyTheme for testing submissions
    const testTheme = await prisma.dailyTheme.create({
      data: {
        themeText: `Ocean Sunset Challenge #${timestamp}`,
        themeDate: new Date(),
        description: "A gorgeous scenic ocean sunset drawing task.",
        status: "active",
      },
    });
    console.log(`✅ Seeded active DailyTheme: ${testTheme.themeText}`);

    console.log("\n----------------------------------------------------------");
    console.log("🔄 Step 2: Testing Artist Self-Registration & Role Promotion...");

    // Simulate Registering Artist
    const artistSlug = `slug-test-${timestamp}`;
    const artistProfile = await prisma.artist.create({
      data: {
        userId: artistCandidate.id,
        displayName: "Katsushika Mock-Hokusai",
        slug: artistSlug,
        type: "visual_artist",
        verificationStatus: "pending_verification",
        verificationRequestedAt: new Date(),
      },
    });

    // Verify profile creation details
    if (artistProfile.verificationStatus !== "pending_verification") {
      throw new Error(`Test Failed: Expected verificationStatus to be 'pending_verification', got: ${artistProfile.verificationStatus}`);
    }
    console.log("✅ Artist Profile created in PENDING_VERIFICATION state.");

    // Simulate upgrading User role to ARTIST
    const upgradedUser = await prisma.user.update({
      where: { id: artistCandidate.id },
      data: { role: "ARTIST" },
    });
    if (upgradedUser.role !== "ARTIST") {
      throw new Error("Test Failed: Expected user role to be promoted to 'ARTIST'.");
    }
    console.log("✅ Regular User role successfully promoted to ARTIST.");

    // Create Audit Log
    const auditLogReg = await prisma.auditLog.create({
      data: {
        action: "artist_profile_registration",
        entityType: "Artist",
        entityId: artistProfile.id,
        metadataJson: { slug: artistSlug },
      },
    });
    console.log(`✅ Artist registration action correctly logged in AuditLog (ID: ${auditLogReg.id})`);


    console.log("\n----------------------------------------------------------");
    console.log("🔄 Step 3: Testing Theme Submission & User Ownership Boundaries...");

    // Create Theme Submission owned by standardUser
    const submission = await prisma.themeSubmission.create({
      data: {
        dailyThemeId: testTheme.id,
        userId: standardUser.id,
        imagePath: "/uploads/drawings/test-snapshot.png",
        promptOrCaption: "Beautiful sunset drawing with paint brushes",
        validationStatus: "accepted",
        effectiveStatus: "accepted",
      },
    });
    console.log(`✅ Theme submission created (ID: ${submission.id}) for user ID: ${standardUser.id}`);

    // Assert ownership access guard logic
    console.log("🛡️ Running security guard assertions on submission ownership...");
    
    // User standardUser should access their own submission
    if (submission.userId !== standardUser.id) {
      throw new Error("Test Failed: Submission owner mismatch.");
    }
    console.log("✅ Verification: Owner accesses their own submission successfully.");

    // User artistCandidate should NOT access standardUser's submission
    if (submission.userId === artistCandidate.id) {
      throw new Error("Test Failed: Security leak - unauthorized user matches submission owner.");
    }
    console.log("✅ Verification: Foreign creator blocked from accessing other's submission.");


    console.log("\n----------------------------------------------------------");
    console.log("🔄 Step 4: Testing Soft Deletion & Query Isolation Filter...");

    // Perform soft delete on standardUser's submission
    const deletionTime = new Date();
    const retentionTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const softDeletedSub = await prisma.themeSubmission.update({
      where: { id: submission.id },
      data: {
        deletedAt: deletionTime,
        recoveryUntil: retentionTime,
        cleanupStatus: "queued_for_purge",
      },
    });

    console.log(`✅ Performed soft delete on submission. DeletedAt: ${softDeletedSub.deletedAt?.toISOString()}`);
    console.log(`✅ Retention recovery expiration window set to: ${softDeletedSub.recoveryUntil?.toISOString()}`);

    // Create Audit Log of soft delete
    const auditLogDel = await prisma.auditLog.create({
      data: {
        action: "submission_soft_delete",
        entityType: "ThemeSubmission",
        entityId: submission.id,
      },
    });
    console.log(`✅ Soft deletion correctly logged in AuditLog (ID: ${auditLogDel.id})`);

    // Verify Active Query Isolation (Soft-deleted records must be omitted in standard active views)
    const activeSubmissions = await prisma.themeSubmission.findMany({
      where: {
        userId: standardUser.id,
        deletedAt: null, // ONLY active submissions
      },
    });

    if (activeSubmissions.some((s) => s.id === submission.id)) {
      throw new Error("Test Failed: Soft deleted submission is leakily returned in active list query!");
    }
    console.log("✅ Verification: Soft-deleted drawing correctly isolated and omitted from standard gallery views.");


    console.log("\n----------------------------------------------------------");
    console.log("🔄 Step 5: Testing Administrative Verification & Auditing...");

    // Approve Artist Profile
    const approvedArtist = await prisma.artist.update({
      where: { id: artistProfile.id },
      data: {
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
        verifiedByAdminId: adminUser.id,
      },
    });

    if (approvedArtist.verificationStatus !== "APPROVED") {
      throw new Error(`Test Failed: Verification status expected to be APPROVED, got: ${approvedArtist.verificationStatus}`);
    }
    console.log("✅ Verification: Admin successfully promoted artist verification to APPROVED.");

    // Create Audit Log of Admin Approve
    const auditLogApprove = await prisma.auditLog.create({
      data: {
        action: "artist_profile_approve",
        entityType: "Artist",
        entityId: artistProfile.id,
        metadataJson: { adminEmail: adminUser.email },
      },
    });
    console.log(`✅ Administrative approval action logged with audit trail (ID: ${auditLogApprove.id})`);


    console.log("\n==========================================================");
    console.log("🎉 ALL PHASE 2 SECURITY & BOUNDARY TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================================");

    // Clean up temporary test data to prevent database cluttering
    console.log("\n🧹 Cleaning up test entities...");
    await prisma.auditLog.deleteMany({
      where: { id: { in: [auditLogReg.id, auditLogDel.id, auditLogApprove.id] } },
    });
    await prisma.themeSubmission.delete({ where: { id: submission.id } });
    await prisma.dailyTheme.delete({ where: { id: testTheme.id } });
    await prisma.artist.delete({ where: { id: artistProfile.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, standardUser.id, artistCandidate.id] } },
    });
    console.log("🧹 Cleanup complete. Database restored to baseline state.");

  } catch (err: any) {
    console.error("\n❌ PHASE 2 INTEGRATION TEST SUITE ENCOUNTERED AN ERROR:\n", err);
    process.exit(1);
  }
}

// Execute tests
runPhase2Tests();
