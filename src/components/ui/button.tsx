import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
      {
        "bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-600/20":
          variant === "default",
        "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300":
          variant === "outline",
        "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900":
          variant === "ghost",
        "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20":
          variant === "destructive",
      },
      {
        "h-10 px-4 text-sm": size === "default",
        "h-8 px-3 text-xs": size === "sm",
        "h-12 px-6 text-base": size === "lg",
        "h-9 w-9 p-0": size === "icon",
      },
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";

export { Button };