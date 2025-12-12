
"use client";

import { CheckCircle2, Clock, XCircle, CalendarCheck, CalendarX } from "lucide-react";
import type { AccountStatus, AccountStatusInfo } from "./types.tsx";

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
  { 
    status: 'in_period', 
    label: 'Khách đang dùng', 
    icon: <CalendarCheck className="h-4 w-4 text-blue-500" />,
    className: "text-blue-600 focus:text-blue-600 focus:bg-blue-50"
  },
  { 
    status: 'expired_period', 
    label: 'Khách quá hạn', 
    icon: <CalendarX className="h-4 w-4 text-orange-500" />,
    className: "text-orange-600 focus:text-orange-600 focus:bg-orange-50"
  },
];

export const getStatusInfo = (status?: AccountStatus) => {
    return ACCOUNT_STATUSES.find(s => s.status === status) || ACCOUNT_STATUSES[0];
}

export const getStatusIcon = (status?: AccountStatus) => {
    return getStatusInfo(status).icon;
}

export const getStatusText = (status?: AccountStatus) => {
    return getStatusInfo(status).label;
}
