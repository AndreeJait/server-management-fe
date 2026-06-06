"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type CheckboxProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked">;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded border border-zinc-300 transition-colors duration-200",
        checked && "border-violet-600 bg-violet-600",
        className,
      )}
    >
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only"
        {...props}
      />
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };