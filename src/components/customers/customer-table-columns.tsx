
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Customer } from "@/lib/types.tsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit } from "lucide-react";
import { format, isValid } from "date-fns";

interface GetColumnsProps {
  onEdit: (customer: Customer) => void;
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

export const getColumns = ({ onEdit }: GetColumnsProps): ColumnDef<Customer>[] => [
  {
    accessorKey: "name",
    header: "Tên khách hàng",
    cell: ({ row }) => <div className="font-medium truncate" title={row.original.name}>{row.original.name}</div>,
    meta: {
      headerClassName: "w-[200px]",
      cellClassName: "w-[200px]",
    }
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.phone || <span className="text-muted-foreground">N/A</span>,
    meta: {
      headerClassName: "w-[150px] text-center",
      cellClassName: "w-[150px] text-center",
    }
  },
  {
    accessorKey: "created_at",
    header: "Ngày tạo",
    cell: ({ row }) => <CreatedAtCell timestamp={row.original.created_at} />,
    meta: {
      headerClassName: "w-[180px] text-center",
      cellClassName: "w-[180px] text-center",
    },
  },
  {
    accessorKey: "notes",
    header: "Ghi chú",
    cell: ({ row }) => {
      const note = row.original.notes;
      if (!note) return <span className="text-muted-foreground">N/A</span>;
      return <div className="truncate" title={note}>{note}</div>
    },
    meta: {
        // This column will take the remaining available space
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Chỉnh sửa</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    meta: {
        headerClassName: "w-[50px] text-center",
        cellClassName: "w-[50px]"
    }
  },
];
