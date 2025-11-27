import { Home, ScrollText, Users, Shield, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navLinks: NavLink[] = [
  { href: "/", label: "Tài Khoản", icon: Home },
  { href: "/customers", label: "Khách Hàng", icon: Users },
  { href: "/emails", label: "Email được phép", icon: Shield },
  { href: "/audit-log", label: "Auditlogs", icon: ScrollText },
];
