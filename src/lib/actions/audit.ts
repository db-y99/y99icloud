import { supabase } from '@/lib/supabase/config';

export const logAction = async (
  userId: string,
  email: string,
  action: string,
  details: string
) => {
  try {
    // This action is now subject to Supabase Row Level Security.
    // If the policies deny write access to the 'audit_logs' table
    // for the currently logged-in user, this operation will fail silently.
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        email,
        action,
        details,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    // We log the error to the console for debugging, but don't show a toast
    // to the user, as this is a background process.
    console.error("Error logging action (this may be due to RLS policies):", error);
  }
};
