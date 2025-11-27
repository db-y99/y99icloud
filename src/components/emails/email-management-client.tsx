"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/config";
import type { AllowedEmail, AllowedEmailFormValues } from "@/lib/types.tsx";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShieldAlert } from "lucide-react";
import { getEmailColumns } from "./email-table-columns";
import { EmailFormDialog } from "./email-form-dialog";
import { DataTable } from "../ui/data-table";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePageActions } from "@/contexts/page-actions-context";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";
import { logAction } from "@/lib/actions/audit";
import { useIsOwner } from "@/hooks/use-is-owner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailManagementClient() {
  const isMountedRef = useRef(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<AllowedEmail | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const { setActions, clearActions } = usePageActions();

  const { data: allowedEmails, loading } = useSupabaseSubscription<AllowedEmail>('allowed_emails', {
    select: '*',
    orderBy: { column: 'added_at', ascending: false }
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleEdit = useCallback((email: AllowedEmail) => {
    setSelectedEmail(email);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedEmail(null);
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    if (isOwner) {
      setActions(
        <div className="flex items-center gap-2">
          <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Thêm Email
          </Button>
        </div>
      );
    } else {
      clearActions();
    }

    return () => clearActions();
  }, [setActions, clearActions, handleAddNew, isOwner]);

  const columns = useMemo(() => getEmailColumns({ onEdit: handleEdit }), [handleEdit]);

  if (!isMountedRef.current) {
    return null;
  }

  // Show loading skeleton while checking owner status or loading data
  if (ownerLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="border-b p-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show access denied message if user is not an owner
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Không có quyền truy cập</CardTitle>
          </div>
          <CardDescription>
            Chỉ có Owner mới được phép quản lý Email được phép.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nếu bạn cần quyền truy cập, vui lòng liên hệ với Owner để được cấp quyền.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DataTable columns={columns} data={allowedEmails} />
      <EmailFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        email={selectedEmail}
      />
    </>
  );
}
