import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant =
  "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

const variants: Record<BadgeVariant, string> = {
  default: "border-transparent bg-brand-600 text-white",
  secondary: "border-transparent bg-brand-100 text-brand-800",
  outline: "border-[#bfc5d4] bg-white text-[var(--ink)]",
  success: "border-transparent bg-[#d8f8df] text-[#006d28]",
  warning: "border-transparent bg-[#fff0d7] text-[#8b4700]",
  destructive: "border-transparent bg-[#ffdad6] text-[#93000a]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
