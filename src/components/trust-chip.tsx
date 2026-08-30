import { Badge } from "@/components/ui/badge";
import { originLabel, p } from "@/lib/practice/copy";
import type { Origin } from "@/lib/practice/types";
import type { OutputLang } from "@/lib/research/types";

export function TrustChip({ origin, lang }: { origin: Origin | string; lang: OutputLang }) {
  const c = p(lang);
  if (origin === "court_direction") return <Badge tone="ok">{c.courtDirected}</Badge>;
  if (origin === "ai_suggestion" || origin === "ai_inference") return <Badge tone="warn">{c.aiSuggestion}</Badge>;
  if (origin === "statute") return <Badge tone="accent">{originLabel(lang, origin)}</Badge>;
  return <Badge>{originLabel(lang, origin as Origin)}</Badge>;
}
