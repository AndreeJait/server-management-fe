import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = {
  variant?: "default" | "secondary" | "outline" | "destructive";
} & React.HTMLAttributes<HTMLSpanElement>;

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-violet-100 text-violet-700": variant === "default",
          "bg-zinc-100 text-zinc-700": variant === "secondary",
          "border border-zinc-200 text-zinc-600": variant === "outline",
          "bg-red-100 text-red-700": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };