
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "../ui/skeleton";
import packageJson from "../../../package.json";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import { handleLogout } from "@/lib/auth/logout";

export function UserButton() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const result = await handleLogout(user);
      
      if (result.success) {
        toast({ title: "Đã đăng xuất", description: "Bạn đã đăng xuất thành công." });
        router.push("/login");
        router.refresh(); // Refresh to clear any cached state
      } else {
        toast({ 
          variant: "destructive", 
          title: "Lỗi", 
          description: result.error || "Không thể đăng xuất." 
        });
      }
    } catch (error) {
      console.error("Sign out error", error);
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể đăng xuất." });
    }
  };


  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.user_metadata?.full_name || ""} />
            <AvatarFallback>
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.charAt(0).toUpperCase()
                : user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="text-xs text-muted-foreground text-center py-1">
          v{packageJson.version}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
