import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * MerchantOS Button — touch-first defaults (≥44px) for Iranian POS handsets.
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
        outline:
          "border border-border bg-card text-foreground shadow-sm hover:bg-surface-container-high hover:text-foreground active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_12px_rgba(0,108,83,0.2)] hover:bg-secondary/90 active:scale-[0.98]",
        ghost: "hover:bg-surface-container-high hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 h-11 px-4 py-2",
        sm: "min-h-9 h-9 rounded-lg px-3 text-xs",
        lg: "min-h-12 h-12 rounded-lg px-8 text-base",
        icon: "min-h-11 min-w-11 size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
