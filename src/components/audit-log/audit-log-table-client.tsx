
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AuditLog } from "@/lib/types.tsx";
import { getAuditLogColumns } from "./audit-log-table-columns";
import { DataTable } from "../ui/data-table";
import { Skeleton } from "../ui/skeleton";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";

export default function AuditLogTableClient() {
  const isMountedRef = useRef(true);
  const { data: logs, loading } = useSupabaseSubscription<AuditLog>('audit_logs', {
    select: '*',
    orderBy: { column: 'timestamp', ascending: false }
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const columns = getAuditLogColumns();

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
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <DataTable columns={columns} data={logs} />;
}
