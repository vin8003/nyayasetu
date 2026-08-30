import { cn } from "@/lib/utils";

/** A bench with authorities stacked on it. */
export function CiteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-accent", className)} fill="none" aria-hidden>
      <path d="M9 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 13.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 18h9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 23h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 23v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 23v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
