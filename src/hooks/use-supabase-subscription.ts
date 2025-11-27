"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/config";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

/**
 * A robust, shared hook for subscribing to a Supabase table.
 * It ensures that authentication is fully resolved before making a request,
 * preventing permission errors and memory leaks.
 * @param tableName The name of the table to subscribe to
 * @param query Optional query configuration
 * @returns An object with the subscribed data and a loading state.
 */
export function useSupabaseSubscription<T extends Record<string, any>>(
  tableName: string,
  query?: {
    select?: string;
    filter?: (query: any) => any;
    orderBy?: { column: string; ascending?: boolean };
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);

  // Memoize query string to avoid unnecessary re-renders
  const queryString = JSON.stringify(query);

  // Debounced fetch function to prevent too many requests
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      let queryBuilder = supabase
        .from(tableName)
        .select(query?.select || '*');

      // Apply filters if provided
      if (query?.filter) {
        queryBuilder = query.filter(queryBuilder);
      }

      // Apply ordering if provided
      if (query?.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy.column, {
          ascending: query.orderBy.ascending ?? true
        });
      }

      const { data: initialData, error } = await queryBuilder;
      
      if (!isMountedRef.current) return;
      
      if (error) throw error;
      setData((initialData || []) as unknown as T[]);
      setLoading(false);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error(`Error fetching ${tableName}:`, error);
      toast({
        variant: "destructive",
        title: "Data Access Error",
        description: "Permission denied or an error occurred. Please try again.",
      });
      setLoading(false);
    }
  }, [tableName, queryString, toast]);

  // Store fetchData function reference for external access
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    isMountedRef.current = true;

    // We must wait for Supabase Auth to be initialized.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // If auth is done and there's no user, we are not logged in.
    // We should not attempt to query, so we stop here.
    if (!user) {
      setLoading(false);
      setData([]); // Clear out old data if any.
      return;
    }

    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Initial fetch
    fetchData();

    // Set up real-time subscription
    const channelName = `${tableName}_changes_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          if (isMountedRef.current) {
            console.log('Change received!', payload);
            // Immediately refetch data on any change to ensure UI is updated
            // Use a delay to ensure database transaction is committed
            setTimeout(() => {
              if (isMountedRef.current && fetchDataRef.current) {
                fetchDataRef.current();
              }
            }, 200);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Clean up the subscription when the component unmounts or dependencies change.
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, authLoading, tableName, queryString, fetchData]);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      // Only refresh if the event is for this table or for all tables
      if (event.detail?.table === tableName || !event.detail?.table) {
        if (fetchDataRef.current) {
          fetchDataRef.current();
        }
      }
    };

    window.addEventListener(`refresh-${tableName}` as any, handleRefresh as EventListener);
    window.addEventListener('refresh-all' as any, handleRefresh as EventListener);

    return () => {
      window.removeEventListener(`refresh-${tableName}` as any, handleRefresh as EventListener);
      window.removeEventListener('refresh-all' as any, handleRefresh as EventListener);
    };
  }, [tableName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Expose a manual refresh function
  const refresh = useCallback(() => {
    if (fetchDataRef.current) {
      fetchDataRef.current();
    }
  }, []);

  return { data, loading, refresh };
}
