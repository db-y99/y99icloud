
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
import type { Customer, CustomerFormValues, Account } from "@/lib/types.tsx";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";

interface CustomerFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customer: Customer | null;
  accountId: string;
}

// Security: Input validation with length limits to prevent DoS attacks
const formSchema = z.object({
  name: z.string()
    .min(1, { message: "Tên không được để trống." })
    .max(255, { message: "Tên không được vượt quá 255 ký tự." }),
  phone: z.string()
    .max(50, { message: "Số điện thoại không được vượt quá 50 ký tự." })
    .optional(),
  notes: z.string()
    .max(5000, { message: "Ghi chú không được vượt quá 5000 ký tự." })
    .optional(),
});

export function CustomerFormDialog({
  isOpen,
  setIsOpen,
  customer,
  accountId,
}: CustomerFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      notes: "",
    },
  });

  useEffect(() => {
    const fetchAccountUsername = async () => {
        if (accountId) {
            const { data: account, error } = await supabase
                .from('accounts')
                .select('username')
                .eq('id', accountId)
                .single();

            if (account && !error) {
                setAccountUsername(account.username);
            }
        }
    };

    if (isOpen) {
        fetchAccountUsername();
        if (customer) {
            form.reset({
                name: customer.name,
                phone: customer.phone || "",
                notes: customer.notes || "",
            });
        } else {
            form.reset({
                name: "",
                phone: "",
                notes: "",
            });
        }
    }
  }, [customer, form, isOpen, accountId]);

  const onSubmit = async (values: CustomerFormValues) => {
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
      if (customer) {
        // Update customer logic
        const changes: string[] = [];
        const dataToUpdate: any = {
            updated_at: new Date().toISOString(),
        };

        if (values.name !== customer.name) {
            changes.push(`Tên (từ '${customer.name}' thành '${values.name}')`);
            dataToUpdate.name = values.name;
        }
        if ((values.phone || '') !== (customer.phone || '')) {
            changes.push(`SĐT (từ '${customer.phone || ''}' thành '${values.phone || ''}')`);
            dataToUpdate.phone = values.phone || '';
        }
        if ((values.notes || '') !== (customer.notes || '')) {
            changes.push(`Ghi chú (từ '${customer.notes || ''}' thành '${values.notes || ''}')`);
            dataToUpdate.notes = values.notes || '';
        }

        if (changes.length > 0) {
            const { error } = await supabase
                .from('customers')
                .update(dataToUpdate)
                .eq('id', customer.id);

            if (error) throw error;

            const logDetails = `Đã cập nhật khách hàng '${customer.name}' trong tài khoản ${accountUsername}. Thay đổi: ${changes.join(', ')}.`;
            await logAction(user.id, user.email, "CUSTOMER_UPDATED", logDetails);
            toast({ title: "Thành công", description: "Cập nhật khách hàng thành công." });
            // Small delay to ensure database transaction is committed before subscription triggers
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            toast({ title: "Không có thay đổi", description: "Không có thông tin nào được cập nhật." });
        }

      } else {
        // Create customer logic
        const { error } = await supabase
            .from('customers')
            .insert({
                account_id: parseInt(accountId),
                name: values.name,
                phone: values.phone || null,
                notes: values.notes || null,
            });

        if (error) throw error;

        await logAction(user.id, user.email, "CUSTOMER_CREATED", `Đã thêm khách hàng mới '${values.name}' vào tài khoản ${accountUsername}.`);
        toast({ title: "Thành công", description: "Thêm khách hàng thành công." });
        // Small delay to ensure database transaction is committed before subscription triggers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      const actionType = customer ? "cập nhật" : "thêm";
      const errorMessage = error instanceof Error ? error.message : `Không thể ${actionType} khách hàng.`;
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
          <DialogTitle>{customer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}</DialogTitle>
          <DialogDescription>
            {customer
              ? "Cập nhật chi tiết cho khách hàng này."
              : "Điền thông tin chi tiết cho khách hàng mới."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên khách hàng</FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
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
                {customer ? "Lưu thay đổi" : "Thêm khách hàng"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
