
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { logAction } from "@/lib/actions/audit";

export function LoginForm() {
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error message from URL (e.g., after middleware redirect)
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'email_not_allowed') {
      toast({
        variant: "destructive",
        title: "Email không được phép",
        description: "Email của bạn không nằm trong danh sách email được phép đăng nhập. Vui lòng liên hệ quản trị viên.",
        duration: 5000,
      });
      // Remove error from URL
      router.replace('/login');
    }
  }, [searchParams, toast, router]);

  const handleSuccessfulLogin = async (user: any) => {
    if (!user || !user.email) {
      setIsProcessingLogin(false);
      return;
    }

    // Không cần check email ở đây nữa vì AuthProvider đã check rồi
    // Chỉ cần log action và redirect
    try {
        await logAction(user.id, user.email, "LOGIN_SUCCESS", "User logged in successfully.");
        toast({
          title: "Đăng nhập thành công",
          description: `Chào mừng, ${user.user_metadata?.full_name || user.email}!`,
        });
        router.push("/");
    } catch (e) {
        console.warn("Could not write to audit log, but proceeding with login:", e);
        toast({
          title: "Đăng nhập thành công",
          description: `Chào mừng, ${user.user_metadata?.full_name || user.email}!`,
        });
        router.push("/");
    }
  }

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await handleSuccessfulLogin(user);
      } else {
        setIsProcessingLogin(false);
      }
    };
    checkUser();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsProcessingLogin(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Supabase configuration is missing. Check your environment variables.");
      toast({
        variant: "destructive",
        title: "Lỗi cấu hình",
        description: "Không thể kết nối đến dịch vụ xác thực. Vui lòng liên hệ quản trị viên.",
      });
      setIsProcessingLogin(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        variant: "destructive",
        title: "Lỗi đăng nhập",
        description: "Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.",
        duration: 5000,
      });
      setIsProcessingLogin(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border">
      <div className="text-center">
         <div className="flex justify-center items-center mb-4">
            <Image src="https://y99.vn/logo.png" alt="Y99 Logo" width={120} height={56} className="h-14 w-[120px]" />
         </div>
        <h1 className="text-3xl font-bold font-headline">Y99 Icloud</h1>
        <p className="text-muted-foreground mt-2">
          Đăng nhập an toàn cho nhân viên được ủy quyền.
        </p>
      </div>
      <Button
        onClick={handleGoogleSignIn}
        disabled={isProcessingLogin}
        className="w-full"
      >
        {isProcessingLogin ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-65.7 64.9C335 110.1 294.6 96 248 96c-88.8 0-160.1 71.1-160.1 160.1s71.3 160.1 160.1 160.1c98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"
            ></path>
          </svg>
        )}
        Đăng nhập với Google
      </Button>
      <p className="px-8 text-center text-sm text-muted-foreground">
        Bạn phải đăng nhập bằng tài khoản đã được cấp quyền trong hệ thống.
      </p>
    </div>
  );
}
