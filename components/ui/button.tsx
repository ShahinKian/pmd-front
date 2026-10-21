import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none disabled:opacity-50 whitespace-nowrap disabled:pointer-events-none",
  {
    variants: {
      color: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        primary: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive: "bg-destructive text-white hover:bg-destructive/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      variant: {
        outline: "border border-current bg-transparent hover:bg-primary hover:text-primary-foreground",
        soft: "bg-opacity-10",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-10 px-4 py-[10px]",
        sm: "h-9 px-3",
        lg: "h-11 px-[18px] py-[10px] text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { color: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, color, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, color, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
