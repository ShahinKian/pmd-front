"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type StatusAlertType = "error" | "success" | "warning" | "info";

const config = {
  error: {
    color: "destructive" as const,
    icon: AlertCircle,
    title: "خطا",
  },
  success: {
    color: "success" as const,
    icon: CheckCircle2,
    title: "انجام شد",
  },
  warning: {
    color: "warning" as const,
    icon: AlertTriangle,
    title: "توجه",
  },
  info: {
    color: "info" as const,
    icon: Info,
    title: "اطلاع",
  },
};

export default function StatusAlert({
  type,
  message,
  title,
  dismissible = false,
  onDismiss,
  className,
}: {
  type: StatusAlertType;
  message: string;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const item = config[type];
  const Icon = item.icon;

  return (
    <Alert
      color={item.color}
      variant="soft"
      dismissible={dismissible}
      onDismiss={onDismiss}
      className={className}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-current/10 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <AlertTitle>{title ?? item.title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
