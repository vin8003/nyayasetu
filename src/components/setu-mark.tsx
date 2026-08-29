import { cn } from "@/lib/utils";

export function SetuMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-accent", className)}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 22.5C8.2 16.8 12.4 14.5 16 14.5S23.8 16.8 28 22.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M7 22.5V26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M25 22.5V26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 8V14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="6.5" r="1.7" fill="currentColor" />
      <path d="M10.5 11H21.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.2 11V13.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M20.8 11V13.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
