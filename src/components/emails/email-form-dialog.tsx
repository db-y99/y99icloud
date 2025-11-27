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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { AllowedEmail, AllowedEmailFormValues } from "@/lib/types.tsx";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";

interface EmailFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  email: AllowedEmail | null;
}

// Security: Input validation with length limits to prevent DoS attacks
const formSchema = z.object({
  email: z.string()
    .email({ message: "Phải là một email hợp lệ." })
    .max(255, { message: "Email không được vượt quá 255 ký tự." }),
  role: z.enum(['owner', 'admin', 'user'], {
    required_error: "Vui lòng chọn vai trò.",
  }),
  notes: z.string()
    .max(5000, { message: "Ghi chú không được vượt quá 5000 ký tự." })
    .optional(),
});

export function EmailFormDialog({
  isOpen,
  setIsOpen,
  email,
}: EmailFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "user",
      notes: "",
    },
  });

  useEffect(() => {
    if (email) {
      form.reset({
        email: email.email,
        role: email.role,
        notes: email.notes || "",
      });
    } else {
      form.reset({
        email: "",
        role: "user",
        notes: "",
      });
    }
  }, [email, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.id || !user?.email) {
      toast({
        variant: 'destructive',
        title: 'Lỗi xác thực',
        description: 'Bạn phải đăng nhập để thực hiện hành động này.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (email) {
        // Update email
        const changes: string[] = [];
        const dataToUpdate: any = {};

        if (values.role !== email.role) {
            changes.push(`Vai trò (từ '${email.role}' thành '${values.role}')`);
            dataToUpdate.role = values.role;
        }
        if ((values.notes || "") !== (email.notes || '')) {
            changes.push(`Ghi chú (từ '${email.notes || ''}' thành '${values.notes || ''}')`);
            dataToUpdate.notes = values.notes || null;
        }

        if (changes.length > 0) {
            const { error } = await supabase
              .from('allowed_emails')
              .update(dataToUpdate)
              .eq('id', email.id);

            if (error) throw error;

            const logDetails = `Đã cập nhật email '${email.email}'. Thay đổi: ${changes.join(', ')}.`;
            await logAction(user.id, user.email, "ALLOWED_EMAIL_UPDATED", logDetails);
            toast({ title: "Thành công", description: "Cập nhật email thành công." });
            // Small delay to ensure database transaction is committed before subscription triggers
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
             toast({ title: "Không có thay đổi", description: "Không có thông tin nào được cập nhật." });
        }

      } else {
        // Create email
        const { error } = await supabase
          .from('allowed_emails')
          .insert({
            email: values.email,
            role: values.role,
            added_by: user.email,
            notes: values.notes || null,
          });

        if (error) throw error;

        await logAction(user.id, user.email, "ALLOWED_EMAIL_ADDED", `Đã thêm email '${values.email}' với vai trò '${values.role}'.`);
        toast({ title: "Thành công", description: "Thêm email thành công." });
      }
      // Close dialog and let real-time subscription update the UI
      setIsOpen(false);
      // Small delay to ensure database transaction is committed before subscription triggers
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(error);
      const actionType = email ? "cập nhật" : "thêm";
      const errorMessage = error.message?.includes('duplicate key')
        ? "Email này đã tồn tại trong danh sách."
        : `Không thể ${actionType} email.`;
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
          <DialogTitle>{email ? "Chỉnh sửa Email" : "Thêm Email mới"}</DialogTitle>
          <DialogDescription>
            {email
              ? "Cập nhật thông tin email được phép truy cập."
              : "Thêm email mới vào danh sách được phép truy cập."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="user@example.com"
                      {...field}
                      disabled={!!email} // Can't change email when editing
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">Owner - Toàn quyền</SelectItem>
                      <SelectItem value="admin">Admin - Quản trị</SelectItem>
                      <SelectItem value="user">User - Người dùng</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (không bắt buộc)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ghi chú về email này..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {email ? "Cập nhật" : "Thêm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
