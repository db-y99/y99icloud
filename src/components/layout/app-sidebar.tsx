
"use client";

import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserButton } from "@/components/layout/user-button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { navLinks } from "@/lib/nav-links";
import { useIsOwner } from "@/hooks/use-is-owner";

export function AppSidebar() {
  const pathname = usePathname();
  const { isOwner, loading: ownerLoading } = useIsOwner();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Y99 Logo" width={96} height={80} className="w-12 h-10" quality={100} priority />
            <h1 className="text-xl font-bold font-headline text-foreground">
              Y99 Icloud
            </h1>
            <div className="flex-1" />
            <SidebarTrigger className="hidden md:flex" />
          </div>
        </SidebarHeader>
        <SidebarMenu>
          {navLinks
            .filter((item) => {
              // Only show "Email được phép" link if user is owner
              // Show link while loading to prevent flicker
              if (item.href === "/emails") {
                return ownerLoading ? true : isOwner;
              }
              return true;
            })
            .map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  );
}
