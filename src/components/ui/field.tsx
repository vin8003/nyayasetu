import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-medium text-fg/90 tracking-tight", className)}
      {...props}
    />
  );
}

export function Hint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted leading-snug", className)} {...props} />;
}

const control =
  "w-full rounded-md bg-elevated text-fg shadow-[0_0_0_1px_rgb(255_255_255/0.08)] placeholder:text-subtle focus:shadow-[0_0_0_1px_rgb(125_154_170/0.7)] focus:outline-none disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      suppressHydrationWarning
      className={cn(control, "h-11 px-3.5 text-sm", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      suppressHydrationWarning
      className={cn(control, "min-h-44 resize-y px-3.5 py-3 text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "cite-select h-11 px-3.5 pr-10 text-sm appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}
