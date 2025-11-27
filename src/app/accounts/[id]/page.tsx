
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import CustomerTableClient from "@/components/customers/customer-table-client";
import { useEffect, useState, useRef } from "react";
import type { Account } from "@/lib/types.tsx";
import { supabase } from "@/lib/supabase/config";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams } from "next/navigation";

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!accountId) return;

    const fetchAccount = async () => {
      if (!isMountedRef.current) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', parseInt(accountId))
          .single();

        if (!isMountedRef.current) return;

        if (data && !error) {
          setAccount(data as Account);
        } else {
          setError("Không tìm thấy tài khoản.");
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error(err);
        setError("Lỗi khi tải dữ liệu tài khoản.");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchAccount();
  }, [accountId]);

  if (!isMountedRef.current) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container flex-1 space-y-4 py-4 md:py-8 pt-6">
        {loading ? (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <Skeleton className="h-10 w-[300px]" />
             </div>
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
                     <Skeleton className="h-4 w-28" />
                     <Skeleton className="h-4 w-20" />
                   </div>
                 ))}
               </div>
             </div>
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : account ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" asChild>
                      <Link href="/">
                          <ArrowLeft className="h-4 w-4" />
                          <span className="sr-only">Quay lại</span>
                      </Link>
                  </Button>
                  <div>
                      <h2 className="text-3xl font-bold tracking-tight font-headline">
                          Chi tiết Tài khoản
                      </h2>
                      <p className="text-muted-foreground">
                          Tài khoản iCloud: <span className="font-medium text-foreground">{account.username}</span>
                      </p>
                  </div>
              </div>
              <Input
                placeholder="Lọc theo tên, điện thoại hoặc ghi chú..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <CustomerTableClient accountId={accountId || ''} globalFilter={globalFilter} />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
