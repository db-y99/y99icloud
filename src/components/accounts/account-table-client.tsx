
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/config";
import type { Account, AccountStatus } from "@/lib/types";
import { ACCOUNT_STATUSES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download, Users } from "lucide-react";
import { getColumns } from "./account-table-columns";
import { AccountFormDialog } from "./account-form-dialog";
import { DataTable } from "../ui/data-table";
import { Skeleton } from "../ui/skeleton";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePageActions } from "@/contexts/page-actions-context";
import { useSupabaseSubscription } from "@/hooks/use-supabase-subscription";
import { logAction } from "@/lib/actions/audit";
import { triggerRefresh } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStatusIcon, getStatusText } from "@/lib/status-utils";
import { Badge } from "@/components/ui/badge";


const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

export default function AccountTableClient() {
  const isMountedRef = useRef(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const { setActions, clearActions } = usePageActions();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: accounts, loading } = useSupabaseSubscription<Account>('accounts', {
    select: '*',
    filter: (query) => query.is('deleted_at', null),
    orderBy: { column: 'created_at', ascending: false }
  });

  // Use customer_count directly from accounts table (updated by database triggers)
  // No need to fetch all customers - this prevents ERR_INSUFFICIENT_RESOURCES
  const accountsWithCounts = useMemo(() => {
    if (!accounts) return [];
    
    // customer_count is already in the accounts data from the database
    // The database trigger automatically updates this field
    return accounts.map(account => ({
      ...account,
      customer_count: account.customer_count || 0
    }));
  }, [accounts]);
  
  const handleEdit = useCallback((account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  }, []);

  const filteredAccounts = useMemo(() => {
    return accountsWithCounts.filter(account => {
        const matchesGlobalFilter =
            (account.username?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
            (account.phone_number?.toLowerCase() || '').includes(globalFilter.toLowerCase()) ||
            (account.notes?.toLowerCase() || '').includes(globalFilter.toLowerCase());

        const matchesStatusFilter = 
            statusFilter === 'all' || account.status === statusFilter;

        return matchesGlobalFilter && matchesStatusFilter;
    });
  }, [accountsWithCounts, globalFilter, statusFilter]);

  const handleExport = useCallback(() => {
    if (filteredAccounts.length === 0) {
        toast({ variant: "destructive", title: "Không có dữ liệu", description: "Không có tài khoản nào để xuất." });
        return;
    }
    const dataToExport = filteredAccounts.map(({ id, password_history, ...rest }) => rest);
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "icloud-sentinel-accounts.csv");
    toast({ title: "Thành công", description: `Đã xuất ${dataToExport.length} tài khoản.` });
  }, [filteredAccounts, toast]);
  
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!user?.email || !user?.id) {
        toast({ variant: "destructive", title: "Nhập thất bại", description: "Bạn phải đăng nhập để nhập tài khoản."});
        return;
      }
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const allRows: any[] = results.data;

            if (!allRows || allRows.length === 0) {
              toast({
                  variant: "destructive",
                  title: "Không có dữ liệu",
                  description: "Tệp CSV trống hoặc không có dữ liệu.",
              });
              return;
            }

            const mappedRows = allRows.map((row: any) => ({
                username: (row.username || row.email || row.Email || row.Username || '').trim(),
                password: row.password || row.Password || '',
                phoneNumber: row.phoneNumber || row.phone || row.Phone || row.PhoneNumber || '',
                notes: row.notes || row.Notes || '',
            }));

            const validEmailAccounts = mappedRows.filter(acc => acc.username && acc.username.includes('@'));
            
            if (validEmailAccounts.length === 0) {
              toast({
                  variant: "destructive",
                  title: "Không có dữ liệu hợp lệ",
                  description: `Không tìm thấy email hợp lệ nào trong tệp. Đã bỏ qua ${mappedRows.length} dòng không hợp lệ.`,
              });
              return;
            }

            try {
              const existingUsernames = new Set(accounts.map(a => a.username));
              const accountsToAdd = validEmailAccounts.filter(acc => !existingUsernames.has(acc.username));
              const skippedCount = mappedRows.length - accountsToAdd.length;

              if (accountsToAdd.length > 0) {
                  const { error } = await supabase
                    .from('accounts')
                    .insert(
                      accountsToAdd.map(account => ({
                        username: account.username,
                        password: account.password || '',
                        phone_number: account.phoneNumber || null,
                        notes: account.notes || null,
                        status: 'active',
                        password_history: [],
                        customer_count: 0,
                      }))
                    );

                  if (error) {
                    throw error;
                  }
              }
              
              await logAction(
                  user.id,
                  user.email || '',
                  "DATA_IMPORTED",
                  `Đã nhập ${accountsToAdd.length} tài khoản. Bỏ qua ${skippedCount} tài khoản trùng lặp hoặc không hợp lệ.`
              );

              toast({
                  title: "Nhập hoàn tất",
                  description: `${accountsToAdd.length} tài khoản đã được thêm. ${skippedCount} tài khoản trùng lặp hoặc không hợp lệ đã được bỏ qua.`,
              });
              
              // Trigger refresh to update UI immediately
              triggerRefresh('accounts');

            } catch (error) {
              console.error("Import error:", error);
              toast({ variant: "destructive", title: "Nhập thất bại", description: "Đã xảy ra lỗi trong quá trình ghi dữ liệu."});
            }
        },
        error: (err) => {
             console.error("CSV parsing error:", err);
             toast({ variant: "destructive", title: "Nhập thất bại", description: "Không thể phân tích cú pháp tệp CSV."});
        }
      });
      // Reset input value to allow re-uploading the same file
      event.target.value = '';
    }
  }, [user, toast, accounts]);
  
  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Xuất CSV</Button>
        <Button asChild variant="outline">
          <label htmlFor="csv-import" className="cursor-pointer flex items-center">
            <Upload className="mr-2 h-4 w-4" /> Nhập CSV
            <input type="file" id="csv-import" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </Button>
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm mới
        </Button>
      </div>
    );

    return () => clearActions();
  }, [setActions, clearActions, handleAddNew, handleExport, handleImport]);

  const columns = useMemo(() => {
    const baseColumns = getColumns({ onEdit: handleEdit });
    return [
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }: { row: { original: Account } }) => (
          <div className="flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  {getStatusIcon(row.original.status)}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getStatusText(row.original.status)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
        meta: {
          headerClassName: "text-center w-[120px]",
          cellClassName: "text-center w-[120px]",
        },
      },
      {
        accessorKey: "customer_count",
        header: "Số khách",
        cell: ({ row }: { row: { original: Account } }) => (
          <div className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Badge variant="default">{row.original.customer_count || 0}</Badge>
          </div>
        ),
        meta: {
          headerClassName: "text-center w-[120px]",
          cellClassName: "text-center w-[120px]",
        },
      },
      ...baseColumns,
    ];
  }, [handleEdit]);

  if (!isMountedRef.current) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold tracking-tight font-headline">
            Quản lý Tài khoản
          </h2>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
        </div>
        <div className="rounded-md border">
          <div className="border-b p-4">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Quản lý Tài khoản
        </h2>
        <div className="flex items-center gap-2">
           <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AccountStatus | "all")}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Lọc theo trạng thái" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    {ACCOUNT_STATUSES.map(statusInfo => (
                         <SelectItem key={statusInfo.status} value={statusInfo.status}>
                            <div className="flex items-center gap-2">
                                {statusInfo.icon}
                                <span>{statusInfo.label}</span>
                            </div>
                         </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
              placeholder="Lọc theo email, SĐT, ghi chú..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
        </div>
      </div>
      <DataTable columns={columns} data={filteredAccounts} />
      <AccountFormDialog
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        account={selectedAccount}
      />
    </TooltipProvider>
  );
}
