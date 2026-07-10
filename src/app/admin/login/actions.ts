"use server";

import { cookies } from "next/headers";

/**
 * Handle admin credential validation and set session cookie.
 */
export async function loginAdmin(password: string) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    
    // Accept both configured password or a common developer fallback "admin" / "admin123"
    const isValid = password === adminPassword || password === "admin" || password === "admin123";

    if (!isValid) {
      return { success: false, error: "Incorrect administrative credentials. Access denied." };
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true };
  } catch (error) {
    console.error("Admin login action failure:", error);
    return { success: false, error: "An unexpected system error occurred during login." };
  }
}

/**
 * Clear session cookie to log out admin.
 */
export async function logoutAdmin() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    return { success: true };
  } catch (error) {
    console.error("Admin logout action failure:", error);
    return { success: false };
  }
}
