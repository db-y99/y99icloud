
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import AllCustomersTableClient from "@/components/customers/all-customers-table-client";

export default function AllCustomersPage() {
  return (
    <AppLayout>
      <div className="container flex-1 space-y-4 py-4 md:py-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Quản lý Tất cả Khách hàng
          </h2>
        </div>
        <AllCustomersTableClient />
      </div>
    </AppLayout>
  );
}
