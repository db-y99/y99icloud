
"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Account } from "@/lib/types.tsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { format, differenceInDays, addDays, isValid } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

const DeletedAtCell = ({ timestamp }: { timestamp?: string | null }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setIsMounted(true);
    if (timestamp) {
        const date = toDate(timestamp);
        setFormattedDate(isValid(date) ? format(date, "dd/MM/yyyy") : "Ngày không hợp lệ");
    } else {
        setFormattedDate("N/A");
    }
  }, [timestamp]);

  if (!isMounted) {
    return <Skeleton className="h-5 w-24" />;
  }
  
  return <>{formattedDate}</>;
}

const TrashActionsCell = ({ row }: { row: { original: Account }}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [isPermanentlyDeletable, setIsPermanentlyDeletable] = useState(false);
    const account = row.original;

    useEffect(() => {
        setIsMounted(true);
        const deletedAtTimestamp = account.deleted_at;
        if (deletedAtTimestamp) {
            const deletedAt = toDate(deletedAtTimestamp);
            if (isValid(deletedAt)) {
                const permanentDeletionDate = addDays(deletedAt, 30);
                setIsPermanentlyDeletable(new Date() >= permanentDeletionDate);
            }
        }
    }, [account.deleted_at]);

    const handleRestore = async () => {
        if (!user?.id || !user?.email) {
            toast({ variant: "destructive", title: "Lỗi", description: "Bạn phải đăng nhập để khôi phục." });
            return;
        }
        try {
            const { error } = await supabase
                .from('accounts')
                .update({
                    deleted_at: null,
                    deleted_by: null,
                })
                .eq('id', account.id);

            if (error) throw error;

            await logAction(user.id, user.email, "ACCOUNT_RESTORED", `Đã khôi phục tài khoản ${account.username} từ thùng rác`);
            toast({
                title: "Thành công",
                description: `Đã khôi phục tài khoản '${account.username}'`,
            });
            // Small delay to ensure database transaction is committed before subscription triggers
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            toast({ variant: "destructive", title: "Lỗi", description: "Không thể khôi phục tài khoản." });
        }
    };

    const handlePermanentDelete = async () => {
        if (!user?.id || !user?.email) {
            toast({ variant: "destructive", title: "Lỗi", description: "Bạn phải đăng nhập để xóa." });
            return;
        }
        try {
            // Delete all customers associated with this account first
            const { error: customersError } = await supabase
                .from('customers')
                .delete()
                .eq('account_id', account.id);

            if (customersError) {
                console.warn('Error deleting customers:', customersError);
            }

            // Then delete the account
            const { error: accountError } = await supabase
                .from('accounts')
                .delete()
                .eq('id', account.id);

            if (accountError) throw accountError;

            await logAction(user.id, user.email, "ACCOUNT_PERMANENTLY_DELETED", `Đã xóa vĩnh viễn tài khoản ${account.username}`);
            toast({
                title: "Thành công",
                description: `Đã xóa vĩnh viễn tài khoản '${account.username}'`,
            });
            // Small delay to ensure database transaction is committed before subscription triggers
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error("Permanent delete error:", error);
            toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa vĩnh viễn tài khoản." });
        }
    };
      
    if (!isMounted) {
        return (
            <div className="flex justify-center">
                <Skeleton className="h-9 w-24" />
            </div>
        );
    }

    if (isPermanentlyDeletable) {
        return (
            <div className="flex justify-center">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa vĩnh viễn
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn tài khoản
                                <span className="font-medium"> {account.username} </span>
                                và tất cả khách hàng liên quan đến tài khoản này.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive hover:bg-destructive/90">
                                Xóa vĩnh viễn
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    return (
        <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={handleRestore}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Khôi phục
            </Button>
        </div>
    );
}

export const getTrashColumns = (): ColumnDef<Account>[] => [
  {
    accessorKey: "username",
    header: "Email",
  },
  {
    accessorKey: "deleted_by",
    header: "Xóa bởi",
    cell: ({ row }) => row.original.deleted_by || <span className="text-muted-foreground">Không rõ</span>,
    meta: {
      headerClassName: "w-[220px]",
      cellClassName: "w-[220px]",
    },
  },
  {
    accessorKey: "deleted_at",
    header: "Ngày xóa",
    cell: ({ row }) => <DeletedAtCell timestamp={row.original.deleted_at} />,
    meta: {
      headerClassName: "w-[150px] text-center",
      cellClassName: "w-[150px] text-center",
    },
  },
  {
    id: "daysLeft",
    header: "Thời gian còn lại",
    cell: ({ row }) => {
      const [daysLeft, setDaysLeft] = useState<number | null>(null);
      const [isMounted, setIsMounted] = useState(false);

      useEffect(() => {
        setIsMounted(true);
        const deletedAtTimestamp = row.original.deleted_at;
        if (deletedAtTimestamp) {
          const deletedAt = toDate(deletedAtTimestamp);
          if (isValid(deletedAt)) {
            const permanentDeletionDate = addDays(deletedAt, 30);
            setDaysLeft(differenceInDays(permanentDeletionDate, new Date()));
          }
        }
      }, [row.original.deleted_at]);

      if (!isMounted) {
        return (
          <div className="flex justify-center">
            <Skeleton className="h-6 w-[120px]" />
          </div>
        );
      }
      
      if (daysLeft === null || daysLeft < 0) {
        return (
          <div className="flex justify-center">
            <Badge variant="secondary">Sẵn sàng để xóa</Badge>
          </div>
        );
      }

      const isWarning = daysLeft <= 7;

      return (
        <div className="flex justify-center">
          <Badge variant={isWarning ? "destructive" : "secondary"}>
            {isWarning && <AlertTriangle className="mr-1 h-3 w-3" />}
            {`${daysLeft} ngày còn lại`}
          </Badge>
        </div>
      );
    },
    meta: {
      headerClassName: "w-[180px] text-center",
      cellClassName: "w-[180px]",
    },
  },
  {
    id: "actions",
    cell: TrashActionsCell,
    meta: {
      headerClassName: "w-[180px] text-center",
      cellClassName: "w-[180px]",
    }
  },
];
