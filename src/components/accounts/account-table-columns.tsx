
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Account, AccountStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MoreHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordHistoryDialog } from "./password-history-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";
import Link from "next/link";
import { cn, triggerRefresh } from "@/lib/utils";
import { getStatusText } from "@/lib/status-utils";
import { ACCOUNT_STATUSES } from "@/lib/types";


interface GetColumnsProps {
  onEdit: (account: Account) => void;
}

const handleCopyToClipboard = (value: string, toast: (options: any) => void) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(value)
      .then(() => toast({ title: "Đã sao chép vào bộ nhớ tạm!" }))
      .catch(err => {
        console.error('Không thể sao chép:', err);
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể sao chép vào bộ nhớ tạm.' });
      });
  } else {
    toast({ variant: 'destructive', title: 'Lỗi', description: 'Trình duyệt không hỗ trợ sao chép.' });
  }
};

const CopyableCell = ({ value }: { value: string }) => {
  const { toast } = useToast();
  if (!value) {
    return <span className="text-muted-foreground text-center block">N/A</span>;
  }
  // Security: React automatically escapes text content, preventing XSS
  return (
    <div
      className="cursor-pointer mx-auto truncate"
      onClick={() => handleCopyToClipboard(value, toast)}
      title="Nhấn để sao chép"
    >
      {value}
    </div>
  );
};

const PasswordCell = ({ password }: { password?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  if (!password) return <span className="text-muted-foreground text-center block">Chưa đặt</span>;
  
  return (
    <div
      className="font-mono cursor-pointer mx-auto truncate"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => handleCopyToClipboard(password, toast)}
      title="Di chuột để xem, nhấn để sao chép"
    >
      {isVisible ? password : "•".repeat(12)}
    </div>
  );
};

const NoteCell = ({ note, username }: { note?: string; username: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!note) {
    return <span className="text-muted-foreground text-center block">N/A</span>;
  }

  // Security: Sanitize username to prevent XSS
  const sanitizedUsername = username.replace(/[<>]/g, '');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi chú cho {sanitizedUsername}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-80 w-full rounded-md border p-4">
            {/* Security: Render note as plain text to prevent XSS - React automatically escapes */}
            <p className="whitespace-pre-wrap text-sm">{note}</p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <div
        className="truncate mx-auto cursor-pointer"
        title="Nhấn để xem đầy đủ"
        onClick={() => setIsOpen(true)}
      >
        {/* Security: React automatically escapes text content, but we ensure it's treated as text */}
        {note}
      </div>
    </>
  );
};

const AccountActionsCell = ({ row, onEdit }: { row: { original: Account }, onEdit: (account: Account) => void }) => {
  const account = row.original;
  const { user } = useAuth();
  const { toast } = useToast();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleStatusChange = async (newStatus: AccountStatus) => {
    if (!user?.id || !user?.email) {
      toast({ variant: "destructive", title: "Lỗi", description: "Bạn phải đăng nhập để thay đổi trạng thái." });
      return;
    }
    const oldStatusLabel = getStatusText(account.status);
    const newStatusLabel = getStatusText(newStatus);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      if (error) throw error;

      await logAction(
        user.id,
        user.email,
        "ACCOUNT_STATUS_CHANGED",
        `Đã thay đổi trạng thái tài khoản ${account.username} từ '${oldStatusLabel}' sang '${newStatusLabel}'.`
      );
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái của '${account.username}'.`,
      });
      // Trigger refresh to update UI immediately
      triggerRefresh('accounts');
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật trạng thái.";
      toast({ 
        variant: "destructive", 
        title: "Lỗi", 
        description: errorMessage 
      });
    }
  }

  return (
    <>
      <PasswordHistoryDialog
        isOpen={isHistoryOpen}
        setIsOpen={setIsHistoryOpen}
        account={account}
      />
      <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-10 p-0">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <span>Thay đổi trạng thái</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {ACCOUNT_STATUSES.map(({ status, label, icon, className }) => (
                            <DropdownMenuItem 
                                key={status} 
                                onClick={() => handleStatusChange(status)}
                                disabled={account.status === status}
                                className={cn("flex items-center gap-2", className)}
                            >
                                {icon}
                                <span>{label}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem
                onClick={() => setIsHistoryOpen(true)}
                disabled={(account.password_history?.length || 0) === 0}
              >
                Lịch sử mật khẩu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </>
  );
};


export const getColumns = ({
  onEdit,
}: GetColumnsProps): ColumnDef<Account>[] => [
  {
    accessorKey: "username",
    header: "Email",
    cell: ({ row }) => {
        const account = row.original;
        return (
            <Link 
                href={`/accounts/${account.id}`}
                className="font-medium text-primary hover:underline"
                title="Quản lý khách hàng"
            >
                {account.username}
            </Link>
        )
    },
    meta: {
      headerClassName: "text-center w-[300px]",
      cellClassName: "text-center w-[300px]",
    },
  },
  {
    accessorKey: "password",
    header: "Mật khẩu",
    cell: ({ row }) => <div className="truncate mx-auto"><PasswordCell password={row.original.password} /></div>,
    meta: {
      headerClassName: "text-center w-[150px]",
      cellClassName: "text-center w-[150px]",
    },
  },
  {
    accessorKey: "phone_number",
    header: "Số điện thoại",
    cell: ({ row }) => <div className="truncate mx-auto"><CopyableCell value={row.original.phone_number || ''} /></div>,
    meta: {
      headerClassName: "text-center w-[150px]",
      cellClassName: "text-center w-[150px]",
    },
  },
  {
    accessorKey: "notes",
    header: "Ghi chú",
    cell: ({ row }) => (
      <NoteCell 
        note={row.original.notes} 
        username={row.original.username} 
      />
    ),
    meta: {
      headerClassName: "text-center", // Take remaining space
      cellClassName: "text-center",
    },
  },
  {
    id: "actions",
    cell: (props) => <AccountActionsCell {...props} onEdit={onEdit} />,
    meta: {
        headerClassName: "w-[50px] text-center",
        cellClassName: "w-[50px]"
    }
  },
];
