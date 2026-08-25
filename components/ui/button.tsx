import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[19px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
        destructive: "bg-[#ba1a1a] text-white hover:bg-[#93000a]",
        outline:
          "border border-[#bfc5d4] bg-white text-[var(--ink)] hover:bg-[#f1f3f6]",
        secondary:
          "border border-[var(--primary)] bg-white text-[var(--primary-dark)] hover:bg-[#eef5ff]",
        ghost: "bg-transparent text-[var(--primary-dark)] hover:bg-[#eef1f5]",
        link: "min-h-0 p-0 text-[var(--primary-dark)] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-12 px-[22px] py-2",
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-10 px-5 text-sm",
        lg: "min-h-12 px-8",
        icon: "size-[42px] min-h-0 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
