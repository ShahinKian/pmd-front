"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
  description?: string;
}

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ label, description, ...props }, ref) => (
  <label className="switch-row">
    <SwitchPrimitive.Root ref={ref} className="switch-root" {...props}>
      <SwitchPrimitive.Thumb className="switch-thumb" />
    </SwitchPrimitive.Root>
    {(label || description) ? (
      <span className="switch-copy">
        {label ? <span className="switch-label">{label}</span> : null}
        {description ? <span className="switch-description">{description}</span> : null}
      </span>
    ) : null}
  </label>
));
Switch.displayName = "Switch";
