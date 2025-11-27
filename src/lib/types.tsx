
import type { ReactNode } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export type AccountStatus = 'active' | 'inactive' | 'pending';

export interface AccountStatusInfo {
  status: AccountStatus;
  label: string;
  icon: ReactNode;
  className: string;
}

export const ACCOUNT_STATUSES: AccountStatusInfo[] = [
  { 
    status: 'active', 
    label: 'Hoạt động', 
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    className: "text-green-600 focus:text-green-600 focus:bg-green-50"
  },
  { 
    status: 'inactive', 
    label: 'Không hoạt động', 
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    className: "text-red-600 focus:text-red-600 focus:bg-red-50"
  },
  { 
    status: 'pending', 
    label: 'Chờ kích hoạt', 
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
    className: "text-yellow-600 focus:text-yellow-600 focus:bg-yellow-50"
  },
];


export interface PasswordHistoryEntry {
  password: string;
  changed_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type CustomerFormValues = Omit<Customer, "id" | "created_at" | "updated_at">;

export interface Account {
  id: string;
  username: string;
  password?: string;
  phone_number?: string;
  notes?: string;
  status: AccountStatus;
  customer_count?: number;
  password_history?: PasswordHistoryEntry[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export type AccountFormValues = {
  username: string;
  password?: string;
  phone_number?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  email: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AllowedEmail {
  id: number;
  email: string;
  role: 'owner' | 'admin' | 'user';
  added_by: string;
  added_at: string;
  is_active: boolean;
  notes?: string;
}

export type AllowedEmailFormValues = {
  email: string;
  role: 'owner' | 'admin' | 'user';
  notes?: string;
}
