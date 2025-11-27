
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Account } from "@/lib/types.tsx";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase/config";
import { logAction } from "@/lib/actions/audit";
import { triggerRefresh } from "@/lib/utils";

interface PasswordHistoryDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  account: Account;
}

const toDate = (value: string): Date => {
  if (!value) return new Date(NaN);
  return new Date(value);
};

export function PasswordHistoryDialog({
  isOpen,
  setIsOpen,
  account,
}: PasswordHistoryDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const sortedHistory = (account.password_history || [])
    .slice() // Create a shallow copy to avoid mutating the original prop
    .sort((a, b) => toDate(b.changed_at).getTime() - toDate(a.changed_at).getTime());


  const handleRestore = async (oldPasswordToRestore: string) => {
    if (!user?.id || !user?.email) {
        toast({ variant: "destructive", title: "Lỗi xác thực." });
        return;
    }

    try {
      const { data: currentAccountData, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', account.id)
        .single();

      if (fetchError || !currentAccountData) throw new Error("Tài khoản không tồn tại");

      const currentPasswordOnDb = currentAccountData.password;
      const currentPasswordTimestamp = currentAccountData.updated_at;

      const dataToUpdate: any = {
          password: oldPasswordToRestore,
          updated_at: new Date().toISOString(),
      };

      // Only add the current password to history if it exists
      if (currentPasswordOnDb) {
          const existingHistory = currentAccountData.password_history || [];
          dataToUpdate.password_history = [
              ...existingHistory,
              { password: currentPasswordOnDb, changed_at: currentPasswordTimestamp },
          ];
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update(dataToUpdate)
        .eq('id', account.id);

      if (updateError) throw updateError;

      await logAction(
        user.id,
        user.email,
        "PASSWORD_RESTORED",
        `Đã khôi phục mật khẩu cũ cho tài khoản ${account.username}. Mật khẩu hiện tại đã được chuyển vào lịch sử.`
      );
      toast({ title: "Thành công", description: "Đã khôi phục mật khẩu." });
      // Trigger refresh to update UI immediately
      triggerRefresh('accounts');
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể khôi phục mật khẩu.";
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lịch sử mật khẩu</DialogTitle>
          <DialogDescription>
            Lịch sử cho <span className="font-medium">{account.username}</span>.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72">
          <div className="space-y-4 pr-6">
            {sortedHistory.length > 0 ? (
              sortedHistory.map((entry, index) => {
                  const changedAtDate = toDate(entry.changed_at);
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm">{entry.password}</p>
                        <p className="text-xs text-muted-foreground">
                          {isValid(changedAtDate)
                            ? format(
                                changedAtDate,
                                "dd/MM/yyyy, HH:mm"
                              )
                            : "Ngày không hợp lệ"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(entry.password)}
                      >
                        <RotateCcw className="mr-2 h-3 w-3" />
                        Khôi phục
                      </Button>
                    </div>
                  );
                })
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Không có lịch sử mật khẩu.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
