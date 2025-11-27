
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { UserButton } from "@/components/layout/user-button";
import { cn } from "@/lib/utils";
import { usePageActions } from "@/contexts/page-actions-context";
import { navLinks } from "@/lib/nav-links";
import { useIsOwner } from "@/hooks/use-is-owner";

export function Header() {
  const pathname = usePathname();
  const { actions } = usePageActions();
  const { isOwner, loading: ownerLoading } = useIsOwner();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Y99 Logo" width={96} height={80} className="h-12 w-24" quality={100} priority />
            <span className="inline-block font-bold font-headline">
              Y99 Icloud
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
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
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:flex items-center gap-2">
            {actions}
          </div>
          <nav className="flex items-center space-x-1">
            <UserButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
