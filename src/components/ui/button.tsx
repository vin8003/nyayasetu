import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none whitespace-normal text-center text-balance transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out active:not-disabled:translate-y-px disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-e1 hover:bg-accent/90",
        outline:
          "bg-transparent text-fg shadow-hairline hover:bg-elevated hover:shadow-hairline-strong",
        ghost: "bg-transparent text-muted hover:bg-elevated hover:text-fg",
        paper: "bg-paper-ink text-paper hover:opacity-90",
        danger: "bg-danger/15 text-danger shadow-hairline hover:bg-danger/25",
      },
      size: {
        sm: "min-h-9 rounded-sm px-3 py-1.5 text-[0.8125rem]",
        md: "min-h-11 rounded-md px-4 py-2 text-sm",
        lg: "min-h-12 rounded-md px-5 py-2.5 text-[0.9375rem]",
        icon: "size-11 shrink-0 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
