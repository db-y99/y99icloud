import { AppLayout } from "@/components/layout/app-layout";
import EmailManagementClient from "@/components/emails/email-management-client";

export default function EmailsPage() {
  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Quản lý Email được phép
          </h2>
        </div>
        <div className="space-y-4">
          <EmailManagementClient />
        </div>
      </div>
    </AppLayout>
  );
}

