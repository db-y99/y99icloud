
"use client";

import { useState, useEffect, useMemo } from "react";
import { analyzePasswordStrength } from "@/ai/flows/analyze-password-strength";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, ShieldCheck, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password?: string;
}

type StrengthLevel = "Yếu" | "Trung bình" | "Mạnh";

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState<StrengthLevel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!password) {
      setStrength(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const handler = setTimeout(async () => {
      try {
        const result = await analyzePasswordStrength({ password });
        setStrength(result.strength);
      } catch (error) {
        console.error("Password analysis failed:", error);
        setStrength(null);
        setError("Không thể phân tích mật khẩu.");
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [password]);

  const { progressValue, indicatorClassName, textColor, Icon } = useMemo(() => {
    if (loading) {
      return {
        progressValue: 50,
        indicatorClassName: "[&>div]:bg-primary",
        textColor: "text-muted-foreground",
        Icon: <Loader2 className="h-4 w-4 animate-spin" />,
      };
    }
    switch (strength) {
      case "Mạnh":
        return {
          progressValue: 100,
          indicatorClassName: "[&>div]:bg-green-500",
          textColor: "text-green-600",
          Icon: <ShieldCheck className="h-4 w-4 text-green-500" />,
        };
      case "Trung bình":
        return {
          progressValue: 66,
          indicatorClassName: "[&>div]:bg-yellow-500",
          textColor: "text-yellow-600",
          Icon: <Shield className="h-4 w-4 text-yellow-500" />,
        };
      case "Yếu":
        return {
          progressValue: 33,
          indicatorClassName: "[&>div]:bg-red-500",
          textColor: "text-red-600",
          Icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
        };
      default:
        return {
          progressValue: 0,
          indicatorClassName: "[&>div]:bg-primary",
          textColor: "text-muted-foreground",
          Icon: null,
        };
    }
  }, [loading, strength]);

  const displayText = useMemo(() => {
    if (loading) return "Đang phân tích...";
    if (error) return error;
    if (strength) return `Độ bảo mật: ${strength}`;
    return null;
  }, [loading, error, strength]);

  if (!password) {
    // Render a placeholder to prevent layout shift.
    // Height (32px) = progress(h-2=8px) + gap(space-y-2=8px) + text(h-4=16px)
    // Margin (8px) is from mt-2 on the container div
    return <div className="mt-2 h-[32px]" />;
  }

  return (
    <div className="space-y-2 mt-2">
      <Progress
        value={progressValue}
        className={cn("h-2", indicatorClassName)}
      />
      <div className="flex items-center gap-2 text-sm h-4">
        {Icon}
        {displayText && <span className={textColor}>{displayText}</span>}
      </div>
    </div>
  );
}
