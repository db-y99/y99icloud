
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import AccountTableClient from "@/components/accounts/account-table-client";

export default function Home() {
  // AppLayout sẽ xử lý việc xác thực.
  // AccountTableClient sẽ tự quản lý trạng thái tải dữ liệu của mình.
  return (
    <AppLayout>
      <div className="container flex-1 space-y-4 py-4 md:py-8 pt-6">
        <AccountTableClient />
      </div>
    </AppLayout>
  );
}
