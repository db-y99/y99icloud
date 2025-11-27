
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Account, AccountFormValues } from "@/lib/types.tsx";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCcw, Eye, EyeOff } from "lucide-react";
import { PasswordStrengthIndicator } from "./password-strength-indicator";
import { useAuth } from "@/hooks/use-auth";
import { generatePassword } from "@/ai/flows/generate-password-flow";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";

interface AccountFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: Account | null;
}

// Security: Input validation with length limits to prevent DoS attacks
const formSchema = z.object({
  username: z.string()
    .email({ message: "Phải là một email hợp lệ." })
    .max(255, { message: "Email không được vượt quá 255 ký tự." }),
  password: z.string()
    .max(500, { message: "Mật khẩu không được vượt quá 500 ký tự." })
    .optional(),
  phone_number: z.string()
    .max(50, { message: "Số điện thoại không được vượt quá 50 ký tự." })
    .optional(),
  notes: z.string()
    .max(5000, { message: "Ghi chú không được vượt quá 5000 ký tự." })
    .optional(),
});

export function AccountFormDialog({
  isOpen,
  setIsOpen,
  account,
}: AccountFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      phone_number: "",
      notes: "",
    },
  });

  const passwordValue = form.watch("password");

  useEffect(() => {
    if (account) {
      form.reset({
        username: account.username,
        password: "", // Always clear password on open
        phone_number: account.phone_number || "",
        notes: account.notes || "",
      });
    } else {
      form.reset({
        username: "",
        password: "",
        phone_number: "",
        notes: "",
      });
    }
    setIsPasswordVisible(false);
  }, [account, form, isOpen]);

  const handleGeneratePassword = async () => {
    setIsGeneratingPassword(true);
    try {
      const result = await generatePassword();
      form.setValue("password", result.password, { shouldValidate: true });
    } catch (error) {
      console.error("Failed to generate password:", error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tạo mật khẩu tự động.",
      });
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const onSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    if (!user?.id || !user?.email) {
      toast({
        variant: 'destructive',
        title: 'Lỗi xác thực',
        description: 'Bạn phải đăng nhập để thực hiện hành động này.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (account) {
        // Update account logic
        const { data: currentAccountData, error: fetchError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', account.id)
          .single();

        if (fetchError || !currentAccountData) {
          throw new Error("Account not found");
        }

        const changes: string[] = [];

        const dataToUpdate: any = {
            updated_at: new Date().toISOString(),
        };

        // Check for changes in fields
        if (values.username !== currentAccountData.username) {
            changes.push(`Email (từ '${currentAccountData.username}' thành '${values.username}')`);
            dataToUpdate.username = values.username;
        }
        if ((values.phone_number || "") !== (currentAccountData.phone_number || '')) {
            changes.push(`Số điện thoại (từ '${currentAccountData.phone_number || ''}' thành '${values.phone_number || ''}')`);
            dataToUpdate.phone_number = values.phone_number || "";
        }
        if ((values.notes || "") !== (currentAccountData.notes || '')) {
            changes.push(`Ghi chú (từ '${currentAccountData.notes || ''}' thành '${values.notes || ''}')`);
            dataToUpdate.notes = values.notes || "";
        }

        // Only update password if a new one is provided
        if (values.password) {
            changes.push("Mật khẩu đã được thay đổi.");
            dataToUpdate.password = values.password;

            // Add the old password to history only if it exists
            if (currentAccountData.password) {
                const existingHistory = currentAccountData.password_history || [];
                dataToUpdate.password_history = [
                    ...existingHistory,
                    { password: currentAccountData.password, changed_at: currentAccountData.updated_at },
                ];
            }
        }

        // Only perform update and logging if there are actual changes
        if (changes.length > 0) {
            const { error: updateError } = await supabase
              .from('accounts')
              .update(dataToUpdate)
              .eq('id', account.id);

            if (updateError) throw updateError;

            const logDetails = `Đã cập nhật tài khoản ${account.username}. Thay đổi: ${changes.join(', ')}.`;
            await logAction(user.id, user.email, "ACCOUNT_UPDATED", logDetails);
            toast({ title: "Thành công", description: "Cập nhật tài khoản thành công." });
            // Small delay to ensure database transaction is committed before subscription triggers
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
             toast({ title: "Không có thay đổi", description: "Không có thông tin nào được cập nhật." });
        }


      } else {
        // Create account logic
        const { error } = await supabase
          .from('accounts')
          .insert({
            username: values.username,
            password: values.password || "",
            phone_number: values.phone_number || "",
            notes: values.notes || "",
            status: 'active', // Default status for new accounts
            password_history: [],
            customer_count: 0, // Initialize customer count
          });

        if (error) throw error;

        await logAction(user.id, user.email, "ACCOUNT_CREATED", `Đã tạo tài khoản mới: ${values.username}.`);
        toast({ title: "Thành công", description: "Tạo tài khoản thành công." });
        // Small delay to ensure database transaction is committed before subscription triggers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      const actionType = account ? "cập nhật" : "tạo";
      const errorMessage = error instanceof Error ? error.message : `Không thể ${actionType} tài khoản.`;
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage,
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{account ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Cập nhật chi tiết cho tài khoản này."
              : "Điền thông tin chi tiết cho tài khoản mới."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="nguoidung@icloud.com" {...field} disabled={!!account}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mật khẩu</FormLabel>
                   <FormControl>
                     <div className="relative">
                        <Input
                          type={isPasswordVisible ? "text" : "password"}
                          placeholder={account ? "Để trống để giữ mật khẩu hiện tại" : "Nhập mật khẩu"}
                          {...field}
                          className="pr-20"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-10 text-muted-foreground"
                            onClick={() => setIsPasswordVisible((prev) => !prev)}
                            aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-full w-10 text-muted-foreground"
                            onClick={handleGeneratePassword}
                            disabled={isGeneratingPassword}
                            aria-label="Tạo mật khẩu tự động"
                          >
                            {isGeneratingPassword ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                   </FormControl>
                  <PasswordStrengthIndicator password={passwordValue} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="+84123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bất kỳ ghi chú nào liên quan..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {account ? "Lưu thay đổi" : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
