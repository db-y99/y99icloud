
"use client";

import { Header } from "@/components/layout/header";
import { PageActionsProvider } from "@/contexts/page-actions-context";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // This is a global loading state for when auth is being checked.
    // It prevents a flash of the login page on a refresh when logged in.
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is logged in but tries to access the login page, redirect them to home.
  if (pathname === '/login') {
    router.push('/');
    return (
         <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
    );
  }

  return (
    <PageActionsProvider>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </PageActionsProvider>
  );
}
