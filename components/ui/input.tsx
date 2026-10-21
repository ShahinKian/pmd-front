import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <div className="flex-1 w-full">
      <input
        type={type}
        className={cn(
          "w-full bg-background border border-default-300 px-3 h-10 text-sm rounded-lg transition duration-300 text-default-700 placeholder:text-default-500/60 focus:outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    </div>
  ),
);
Input.displayName = "Input";

export { Input };
