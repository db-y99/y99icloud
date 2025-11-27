
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Customer } from "@/lib/types.tsx";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { getColumns } from "./customer-table-columns";
import { CustomerFormDialog } from "./customer-form-dialog";
import { DataTable } from "../ui/data-table";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePageActions } from "@/contexts/page-actions-context";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";
import { logAction } from "@/lib/actions/audit";

interface CustomerTableClientProps {
    accountId: string;
    globalFilter: string;
}

export default function CustomerTableClient({ accountId, globalFilter }: CustomerTableClientProps) {
  const isMountedRef = useRef(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { setActions, clearActions } = usePageActions();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: customers, loading } = useSupabaseSubscription<Customer>('customers', {
    select: '*',
    filter: (query) => query.eq('account_id', accountId),
    orderBy: { column: 'created_at', ascending: false }
  });
  
  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      (customer.name?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
      (customer.phone?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
      (customer.notes?.toLowerCase() || '').includes(globalFilter.toLowerCase())
    ).sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
  }, [customers, globalFilter]);
  
  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm khách hàng
        </Button>
      </div>
    );

    return () => clearActions();
  }, [setActions, clearActions, handleAddNew]);

  const columns = useMemo(() => getColumns({ onEdit: handleEdit }), [handleEdit]);

  if (!isMountedRef.current) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="border-b p-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DataTable columns={columns} data={filteredCustomers} />
      <CustomerFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        customer={selectedCustomer}
        accountId={accountId}
      />
    </>
  );
}
