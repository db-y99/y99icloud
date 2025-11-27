
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Account } from "@/lib/types.tsx";
import { DataTable } from "../ui/data-table";
import { getTrashColumns } from "./trash-table-columns";
import { addDays } from "date-fns";
import { Skeleton } from "../ui/skeleton";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";

const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

export default function TrashTableClient() {
  const isMountedRef = useRef(true);
  const { data: allAccounts, loading } = useSupabaseSubscription<Account>('accounts', {
    select: '*',
    filter: (query) => query.not('deleted_at', 'is', null),
    orderBy: { column: 'deleted_at', ascending: false }
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const displayAccounts = useMemo(() => {
    const thirtyDaysAgo = addDays(new Date(), -30);
    // Lọc những tài khoản đã bị xóa trong vòng 30 ngày qua
    return allAccounts.filter(
      (acc) => acc.deleted_at && toDate(acc.deleted_at) > thirtyDaysAgo
    );
  }, [allAccounts]);
  
  const columns = getTrashColumns();
  
  if (!isMountedRef.current) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <DataTable columns={columns} data={displayAccounts} />;
}
