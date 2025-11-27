import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Suspense fallback={
        <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <div className="h-14 w-[120px] bg-muted animate-pulse rounded" />
            </div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mx-auto mb-2" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mx-auto" />
          </div>
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
