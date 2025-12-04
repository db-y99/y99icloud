"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { AllowedEmail } from "@/lib/types.tsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiUpdate, apiDelete } from "@/lib/api-client";
import { logAction } from "@/lib/actions/audit";
import { triggerRefresh } from "@/lib/utils";

interface GetColumnsProps {
  onEdit: (email: AllowedEmail) => void;
}

const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-red-100 text-red-800 border-red-200';
    case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'user': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner': return 'Owner';
    case 'admin': return 'Admin';
    case 'user': return 'User';
    default: return role;
  }
};

const AddedAtCell = ({ timestamp }: { timestamp: string }) => {
  if (!timestamp) return 'N/A';
  const date = toDate(timestamp);
  return isValid(date) ? format(date, "dd/MM/yyyy HH:mm") : "Ngày không hợp lệ";
};

const EmailActionsCell = ({ row, onEdit }: { row: { original: AllowedEmail }, onEdit: (email: AllowedEmail) => void }) => {
  const email = row.original;
  const { user } = useAuth();
  const { toast } = useToast();

  const handleToggleActive = async () => {
    if (!user?.id || !user?.email) {
      toast({ variant: "destructive", title: "Lỗi", description: "Bạn phải đăng nhập." });
      return;
    }

    try {
      // Sử dụng API client để ẩn Supabase URL
      const { error } = await apiUpdate('allowed_emails', {
        data: { is_active: !email.is_active },
        filters: [
          { column: 'id', operator: 'eq', value: email.id }
        ]
      });

      if (error) throw new Error(error);

      const action = email.is_active ? "ALLOWED_EMAIL_DEACTIVATED" : "ALLOWED_EMAIL_ACTIVATED";
      const actionText = email.is_active ? "vô hiệu hóa" : "kích hoạt lại";

      await logAction(user.id, user.email, action, `Đã ${actionText} email '${email.email}'.`);
      toast({
        title: "Thành công",
        description: `Đã ${actionText} email '${email.email}'.`,
      });
      // Trigger refresh to update UI immediately
      triggerRefresh('allowed_emails');
    } catch (error) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể thay đổi trạng thái email." });
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !user?.email) {
      toast({ variant: "destructive", title: "Lỗi", description: "Bạn phải đăng nhập." });
      return;
    }

    try {
      // Sử dụng API client để ẩn Supabase URL
      const { error } = await apiDelete('allowed_emails', [
        { column: 'id', operator: 'eq', value: email.id }
      ]);

      if (error) throw new Error(error);

      await logAction(user.id, user.email, "ALLOWED_EMAIL_DELETED", `Đã xóa email '${email.email}' khỏi danh sách cho phép.`);
      toast({
        title: "Thành công",
        description: `Đã xóa email '${email.email}'.`,
      });
      // Trigger refresh to update UI immediately
      triggerRefresh('allowed_emails');
    } catch (error) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể xóa email." });
    }
  };

  return (
    <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-10 p-0">
              <span className="sr-only">Mở menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(email)}>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleActive}>
              {email.is_active ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Vô hiệu hóa
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Kích hoạt
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
};

export const getEmailColumns = ({
  onEdit,
}: GetColumnsProps): ColumnDef<AllowedEmail>[] => [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.email}
        {!row.original.is_active && (
          <span className="ml-2 text-xs text-red-500">(Vô hiệu hóa)</span>
        )}
      </div>
    ),
    meta: {
      headerClassName: "w-[250px]",
      cellClassName: "w-[250px]",
    },
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => (
      <Badge className={getRoleBadgeClass(row.original.role)}>
        {getRoleLabel(row.original.role)}
      </Badge>
    ),
    meta: {
      headerClassName: "w-[120px] text-center",
      cellClassName: "w-[120px] text-center",
    },
  },
  {
    accessorKey: "added_by",
    header: "Thêm bởi",
    cell: ({ row }) => <div className="text-sm">{row.original.added_by}</div>,
    meta: {
      headerClassName: "w-[150px]",
      cellClassName: "w-[150px]",
    },
  },
  {
    accessorKey: "added_at",
    header: "Ngày thêm",
    cell: ({ row }) => <AddedAtCell timestamp={row.original.added_at} />,
    meta: {
      headerClassName: "w-[150px]",
      cellClassName: "w-[150px]",
    },
  },
  {
    accessorKey: "notes",
    header: "Ghi chú",
    cell: ({ row }) => (
      <div className="truncate max-w-[200px]" title={row.original.notes}>
        {row.original.notes || <span className="text-muted-foreground">Không có</span>}
      </div>
    ),
    meta: {
      headerClassName: "w-[200px]",
      cellClassName: "w-[200px]",
    },
  },
  {
    id: "actions",
    cell: (props) => <EmailActionsCell {...props} onEdit={onEdit} />,
    meta: {
        headerClassName: "w-[80px] text-center",
        cellClassName: "w-[80px]"
    }
  },
];
