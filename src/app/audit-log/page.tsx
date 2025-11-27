
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import AuditLogTableClient from "@/components/audit-log/audit-log-table-client";

export default function AuditLogPage() {
  // AppLayout sẽ xử lý việc xác thực.
  // AuditLogTableClient sẽ tự quản lý trạng thái tải dữ liệu của mình.
  return (
    <AppLayout>
      <div className="container flex-1 space-y-4 py-4 md:py-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Auditlogs
          </h2>
          <p className="text-muted-foreground">A record of all actions performed in the system.</p>
        </div>
        <AuditLogTableClient />
      </div>
    </AppLayout>
  );
}
