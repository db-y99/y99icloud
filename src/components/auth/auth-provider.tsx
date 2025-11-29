"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Lấy session ban đầu
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (!mounted) return;
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Lắng nghe thay đổi trạng thái auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          setUser(session?.user ?? null);
          setLoading(false);
          break;
        case 'SIGNED_OUT':
          setUser(null);
          setLoading(false);
          break;
        default:
          setUser(session?.user ?? null);
          setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
