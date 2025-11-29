"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Kiểm tra email có được phép đăng nhập không
  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('allowed_emails')
        .select('id')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error("Error checking allowed email:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error checking allowed email:", error);
      return false;
    }
  };

  // Xác thực user và kiểm tra email
  const validateUser = async (session: any) => {
    if (!session?.user?.email) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const isAllowed = await checkEmailAllowed(session.user.email);
      
      if (!isAllowed) {
        // Email không được phép, đăng xuất
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Email không được phép",
          description: "Email của bạn không nằm trong danh sách email được phép đăng nhập. Vui lòng liên hệ quản trị viên.",
          duration: 5000,
        });
        router.push('/login');
      } else {
        // Email được phép, set user
        setUser(session.user);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error validating user:", error);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Lấy session ban đầu
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        await validateUser(session);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Lắng nghe thay đổi trạng thái auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        await validateUser(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Khi token refresh, update user
        setUser(session.user);
      } else if (!session?.user) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
