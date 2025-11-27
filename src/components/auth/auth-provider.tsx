
"use client";

import React, { createContext, useState, useEffect, ReactNode, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache để tránh check email nhiều lần
const emailCheckCache = new Map<string, { allowed: boolean; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 phút

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const checkingRef = useRef(false);
  const userRef = useRef<User | null>(null);
  
  // Sync ref với state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    // Check cache first
    const cached = emailCheckCache.get(email);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.allowed;
    }

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

      const allowed = !!data;
      emailCheckCache.set(email, { allowed, timestamp: now });
      return allowed;
    } catch (error) {
      console.error("Error checking allowed email:", error);
      return false;
    }
  };

  const validateUser = async (session: any, event?: string) => {
    if (!session?.user?.email) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Nếu đang check, bỏ qua lần này (tránh duplicate check)
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;
    setLoading(true);

    try {
      // Check email với timeout (5 giây)
      let isAllowed = false;
      try {
        const checkPromise = checkEmailAllowed(session.user.email);
        const timeoutPromise = new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
        
        isAllowed = await Promise.race([checkPromise, timeoutPromise]);
      } catch (error: any) {
        if (error?.message === 'Timeout') {
          console.warn('Email check timeout, denying access');
          isAllowed = false;
        } else {
          throw error;
        }
      }
      
      if (!isAllowed) {
        // Email not allowed, sign out và KHÔNG set user
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
        // Chỉ set user khi email được phép
        setUser(session.user);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error validating user:", error);
      setUser(null);
      setLoading(false);
    } finally {
      checkingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let isInitialCheck = true;

    // Timeout để tránh loading stuck quá lâu (6 giây)
    const setLoadingTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth loading timeout, forcing loading to false');
          setLoading(false);
          checkingRef.current = false;
        }
      }, 6000);
    };

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        // KHÔNG set user ngay - phải check email trước
        setLoadingTimeout();
        await validateUser(session);
      } else {
        setUser(null);
        setLoading(false);
      }
      isInitialCheck = false;
      if (timeoutId) clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // Bỏ qua event nếu đang check initial session
      if (isInitialCheck && event !== 'SIGNED_OUT') {
        return;
      }
      
      if (event === 'SIGNED_IN') {
        // KHÔNG set user ngay - phải check email trước
        if (session?.user) {
          setLoadingTimeout();
          await validateUser(session, event);
        }
        if (timeoutId) clearTimeout(timeoutId);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        checkingRef.current = false;
        emailCheckCache.clear();
        if (timeoutId) clearTimeout(timeoutId);
      } else if (event === 'TOKEN_REFRESHED') {
        // Check lại khi token refresh - nhưng không block UI vì user đã login rồi
        if (session?.user && userRef.current) {
          // Chỉ check ở background nếu user đã tồn tại
          validateUser(session, event).catch(() => {
            // Nếu check fail, không làm gì vì user đã login rồi
          });
        }
        if (timeoutId) clearTimeout(timeoutId);
      } else {
        // Các event khác, chỉ update nếu không có session
        if (!session?.user) {
          setUser(null);
          setLoading(false);
        }
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
