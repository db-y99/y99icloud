
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { Customer, Account } from "@/lib/types.tsx";
import { Input } from "@/components/ui/input";
import { DataTable } from "../ui/data-table";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { format, isValid } from "date-fns";
import { supabase } from "@/lib/supabase/config";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";

interface EnrichedCustomer extends Customer {
  accountId: string;
  accountUsername: string;
}

const toDate = (value: string): Date => {
    if (!value) return new Date(NaN);
    return new Date(value);
};

const CreatedAtCell = ({ timestamp }: { timestamp?: string | null }) => {
    if (!timestamp) return 'N/A';
    const date = toDate(timestamp);
    return isValid(date) ? format(date, "dd/MM/yyyy HH:mm") : "Ngày không hợp lệ";
}

const getColumns = (): ColumnDef<EnrichedCustomer>[] => [
    {
      accessorKey: "name",
      header: "Tên khách hàng",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>
    },
    {
      accessorKey: "accountUsername",
      header: "Tài khoản iCloud",
      cell: ({ row }) => {
          const customer = row.original;
          return (
              <Link 
                  href={`/accounts/${customer.accountId}`}
                  className="font-medium text-primary hover:underline"
                  title="Xem chi tiết tài khoản"
              >
                  {customer.accountUsername}
              </Link>
          )
      },
    },
    {
      accessorKey: "phone",
      header: "Số điện thoại",
      cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">N/A</span>,
    },
    {
      accessorKey: "created_at",
      header: "Ngày tạo",
      cell: ({ row }) => <CreatedAtCell timestamp={row.original.created_at} />,
    },
];

export default function AllCustomersTableClient() {
  const isMountedRef = useRef(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAllCustomers = useCallback(async () => {
    if (!user || !isMountedRef.current) return;
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                *,
                accounts:account_id (
                    id,
                    username
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (!isMountedRef.current) return;

        const enrichedCustomers: EnrichedCustomer[] = (data || []).map(customer => ({
            ...customer,
            accountId: customer.account_id.toString(),
            accountUsername: customer.accounts?.username || 'N/A',
        }));

        setCustomers(enrichedCustomers);

    } catch (error: any) {
        if (!isMountedRef.current) return;
        console.error("Failed to fetch all customers:", error);
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: 'Không thể tải danh sách khách hàng.'
        });
    } finally {
        if (isMountedRef.current) {
            setLoading(false);
        }
    }
  }, [user, toast]);

  useEffect(() => {
    fetchAllCustomers();
  }, [fetchAllCustomers]);

  const filteredCustomers = useMemo(() => customers.filter(customer =>
    (customer.name?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
    (customer.phone?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
    (customer.accountUsername?.toLowerCase() || '').includes(globalFilter.toLowerCase())
  ), [customers, globalFilter]);
  
  const columns = useMemo(() => getColumns(), []);

  if (!isMountedRef.current) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end items-center mb-4">
          <Skeleton className="h-10 w-[300px]" />
        </div>
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
      <div className="flex justify-end items-center mb-4">
        <Input
          placeholder="Lọc theo tên khách, SĐT, hoặc email tài khoản..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <DataTable columns={columns} data={filteredCustomers} />
    </>
  );
}
