"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg p-4 flex items-start gap-3 border",
  {
    variants: {
      color: {
        default: "bg-primary text-primary-foreground border-primary",
        secondary: "bg-secondary text-secondary-foreground border-secondary",
        success: "bg-success text-success-foreground border-success",
        info: "bg-info text-info-foreground border-info",
        warning: "bg-warning text-warning-foreground border-warning",
        destructive: "bg-destructive text-destructive-foreground border-destructive",
        dark: "bg-gray-950 text-slate-50 border-gray-950",
      },
      variant: {
        solid: "",
        outline: "bg-background",
        soft: "bg-opacity-10",
      },
    },
    compoundVariants: [
      { variant: "outline", color: "destructive", className: "text-destructive" },
      { variant: "outline", color: "success", className: "text-success" },
      { variant: "outline", color: "info", className: "text-info" },
      { variant: "outline", color: "warning", className: "text-warning" },
      { variant: "outline", color: "default", className: "text-primary" },
      { variant: "soft", color: "destructive", className: "text-destructive border-destructive/20" },
      { variant: "soft", color: "success", className: "text-success border-success/20" },
      { variant: "soft", color: "info", className: "text-info border-info/20" },
      { variant: "soft", color: "warning", className: "text-warning border-warning/20" },
      { variant: "soft", color: "default", className: "text-primary border-primary/20" },
    ],
    defaultVariants: {
      color: "default",
      variant: "solid",
    },
  },
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, color, variant, dismissible, onDismiss, children, ...props }, ref) => {
    const [dismissed, setDismissed] = React.useState(false);

    if (dismissed) return null;

    return (
      <div ref={ref} role="alert" className={cn(alertVariants({ color, variant }), className)} {...props}>
        <div className="min-w-0 flex-1">{children}</div>
        {dismissible ? (
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="shrink-0 rounded-md p-1 hover:bg-current/10"
            aria-label="بستن پیام"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  },
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mt-1 text-sm leading-6 opacity-90", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
