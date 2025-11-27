"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/config";
import { useAuth } from "@/hooks/use-auth";

// Cache owner status per email to avoid re-checking
const ownerCache = new Map<string, { isOwner: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to check if the current user is an owner
 * An owner is a user whose email exists in allowed_emails table with role='owner' and is_active=true
 * Uses caching to prevent flicker when navigating between tabs
 */
export function useIsOwner() {
  const { user, loading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkOwnerStatus = async () => {
      // Prevent multiple simultaneous checks
      if (checkingRef.current) return;
      
      if (authLoading) {
        setLoading(true);
        return;
      }

      if (!user?.email) {
        setIsOwner(false);
        setLoading(false);
        return;
      }

      // Check cache first
      const cached = ownerCache.get(user.email);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setIsOwner(cached.isOwner);
        setLoading(false);
        return;
      }

      checkingRef.current = true;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('allowed_emails')
          .select('id, role, is_active')
          .eq('email', user.email)
          .eq('role', 'owner')
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking owner status:', error);
          setIsOwner(false);
          ownerCache.set(user.email, { isOwner: false, timestamp: now });
        } else {
          const ownerStatus = !!data;
          setIsOwner(ownerStatus);
          ownerCache.set(user.email, { isOwner: ownerStatus, timestamp: now });
        }
      } catch (error) {
        console.error('Error checking owner status:', error);
        setIsOwner(false);
        ownerCache.set(user.email, { isOwner: false, timestamp: now });
      } finally {
        setLoading(false);
        checkingRef.current = false;
      }
    };

    checkOwnerStatus();
  }, [user, authLoading]);

  return { isOwner, loading };
}

