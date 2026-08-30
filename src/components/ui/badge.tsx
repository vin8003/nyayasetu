import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "accent" | "ok" | "warn" | "danger" | "paper";
}) {
  const tones = {
    muted: "bg-elevated text-muted shadow-hairline",
    accent: "bg-accent/15 text-accent",
    ok: "bg-ok/15 text-ok",
    warn: "bg-warn/15 text-warn",
    danger: "bg-danger/15 text-danger",
    paper: "bg-paper-ink/8 text-paper-muted",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
