
"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { AuditLog } from "@/lib/types.tsx";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

const getBadgeVariantClass = (action: string) => {
    if (action.includes("CREATED") || action.includes("ACCOUNT_RESTORED")) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (action.includes("TRASHED")) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes("LOGIN")) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes("PASSWORD_RESTORED")) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    // default for UPDATED, IMPORTED etc.
    return 'bg-gray-100 text-gray-800 border-gray-200';
}

const ActionBadge = ({ action }: { action: string }) => {
  return <Badge className={getBadgeVariantClass(action)}>{action}</Badge>;
};

const TimestampCell = ({ timestamp }: { timestamp: string }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const date = toDate(timestamp);
    setFormattedDate(isValid(date) ? format(date, "dd/MM/yyyy, HH:mm") : "Ngày không hợp lệ");
  }, [timestamp]);

  if (!isMounted) {
    // Render a skeleton during SSR and initial client render to avoid mismatch
    return <Skeleton className="h-5 w-28" />;
  }

  return <>{formattedDate}</>;
}

export const getAuditLogColumns = (): ColumnDef<AuditLog>[] => [
  {
    accessorKey: "timestamp",
    header: "Dấu thời gian",
    cell: ({ row }) => <TimestampCell timestamp={row.original.timestamp} />,
    meta: {
      headerClassName: "w-[180px] text-center",
      cellClassName: "w-[180px] text-center",
    },
  },
  {
    accessorKey: "email",
    header: "Người dùng",
    meta: {
      headerClassName: "w-[220px] text-center",
      cellClassName: "w-[220px] text-center",
    },
  },
  {
    accessorKey: "action",
    header: "Hành động",
    cell: ({ row }) => <div className="flex justify-center"><ActionBadge action={row.original.action} /></div>,
    meta: {
      headerClassName: "w-[220px] text-center",
      cellClassName: "w-[220px] text-center",
    },
  },
  {
    accessorKey: "details",
    header: "Chi tiết",
    meta: {
        headerClassName: "text-center",
        cellClassName: "text-center",
    },
  },
];
