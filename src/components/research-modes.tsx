import { useNavigate } from "@tanstack/react-router";
import { Segmented } from "@/components/segmented";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";

export function ResearchModes({
  lang,
  mode,
  matter,
  memo,
}: {
  lang: OutputLang;
  mode: "brief" | "ask";
  matter?: string;
  memo?: string;
}) {
  const c = p(lang);
  const navigate = useNavigate();
  return (
    <div className="research-modes">
      <Segmented
        ariaLabel={c.research}
        value={mode}
        onChange={(next) => {
          if (next === "ask") navigate({ to: "/ask", search: { matter, memo } });
          else navigate({ to: "/research", search: { matter, memo } });
        }}
        options={[
          { value: "brief", label: c.research },
          { value: "ask", label: c.ask },
        ]}
      />
    </div>
  );
}
