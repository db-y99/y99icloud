"use client";

import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";
import { User } from "@supabase/supabase-js";

/**
 * Centralized logout function
 * Handles logout logic including audit logging
 */
export async function handleLogout(user: User | null): Promise<{ success: boolean; error?: string }> {
  try {
    // Log logout action before signing out (if user exists)
    if (user?.id && user?.email) {
      try {
        await logAction(user.id, user.email, "LOGOUT", "User logged out successfully.");
      } catch (logError) {
        // Don't block logout if audit log fails
        console.warn("Could not write to audit log, but proceeding with logout:", logError);
      }
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error during logout:", error);
    return { success: false, error: error?.message || "Đã xảy ra lỗi không mong muốn" };
  }
}

