
"use client";

import { Header } from "@/components/layout/header";
import { PageActionsProvider } from "@/contexts/page-actions-context";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect to login if not authenticated (middleware handles this too, but this provides client-side fallback)
    if (!loading && !user && pathname !== '/login') {
      router.push("/login");
    }
    
    // Redirect to home if authenticated and on login page
    if (!loading && user && pathname === '/login') {
      router.push("/");
    }
  }, [user, loading, router, pathname]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render layout if user is not authenticated (will redirect)
  if (!user) {
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
