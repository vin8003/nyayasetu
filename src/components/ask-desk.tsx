import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { askChamber } from "@/lib/ask/store";
import { listMatters } from "@/lib/practice/store";
import type { OutputLang } from "@/lib/research/types";
import { AskMarkdown } from "@/components/ask-markdown";
import { Button } from "@/components/ui/button";

type Turn = { role: "user" | "assistant"; content: string };
type MatterHit = { id: string; title: string; caseNumber?: string; courtName?: string };

function isUnauthorized(err: unknown) {
  return /unauthorized/i.test(err instanceof Error ? err.message : String(err ?? ""));
}

const COPY = {
  en: {
    title: "Ask",
    hint: "A short answer, searched on the same sources as Research. Only a retrieved authority is cited.",
    general: "General — no case file",
    matter: "Case",
    placeholder: "What do you need before the next date?",
    you: "You",
    desk: "CiteBench",
    send: "Ask",
    sending: "Searching the authorities…",
    empty: "Ask about limitation, the next step, or what is already on the file.",
    disclaimer: "Verify before you file or appear. CiteBench does not confirm an order.",
    unavailable: "The assistant is not available right now.",
    failed: "That question did not come back. Try again.",
    missing: "That matter is not on this desk.",
    paywall: "The trial does not cover another answer.",
    upgrade: "See the plan",
  },
  hi: {
    title: "पूछें",
    hint: "छोटा जवाब, उन्हीं स्रोतों पर खोज कर। केवल वही प्राधिकारी जिसका लिंक मिला।",
    general: "सामान्य — कोई केस फ़ाइल नहीं",
    matter: "मामला",
    placeholder: "अगली तारीख से पहले क्या चाहिए?",
    you: "आप",
    desk: "CiteBench",
    send: "पूछें",
    sending: "प्राधिकारी खोज रहे हैं…",
    empty: "limitation, अगला कदम, या फ़ाइल में जो पहले से है — पूछें।",
    disclaimer: "फाइल करने या पेश होने से पहले जाँचें। CiteBench आदेश की पुष्टि नहीं करता।",
    unavailable: "अभी सहायक उपलब्ध नहीं है।",
    failed: "जवाब नहीं आया। फिर कोशिश करें।",
    missing: "यह मामला इस डेस्क पर नहीं है।",
    paywall: "आज़माइश में और जवाब नहीं है।",
    upgrade: "योजना देखें",
  },
} as const;

export function AskDesk({ lang, matterId }: { lang: OutputLang; matterId?: string }) {
  const c = COPY[lang];
  const navigate = useNavigate();
  const [matters, setMatters] = useState<MatterHit[]>([]);
  const [matter, setMatter] = useState(matterId ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(matterId ?? "");

  useEffect(() => {
    listMatters()
      .then((rows) => setMatters(rows as MatterHit[]))
      .catch((err) => {
        if (isUnauthorized(err)) navigate({ to: "/login" });
      });
  }, [navigate]);

  useEffect(() => {
    if ((matterId ?? "") === pinned.current) return;
    pinned.current = matterId ?? "";
    setMatter(matterId ?? "");
    setTurns([]);
    setError("");
  }, [matterId]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  function onMatter(next: string) {
    setMatter(next);
    setTurns([]);
    setError("");
    navigate({ to: "/ask", search: { matter: next || undefined } });
  }

  async function send() {
    const content = draft.trim();
    if (content.length < 2 || busy) return;
    const history = [...turns, { role: "user" as const, content }].slice(-12);
    setDraft("");
    setTurns(history);
    setError("");
    setBusy(true);
    try {
      const result = await askChamber({
        data: {
          matterId: matter || undefined,
          lang,
          messages: history,
        },
      });
      if (!result.ok) {
        setError(
          result.error === "PAYWALL"
            ? c.paywall
            : result.error === "MATTER_NOT_FOUND"
              ? c.missing
              : result.error === "AI_UNAVAILABLE"
                ? c.unavailable
                : c.failed,
        );
        return;
      }
      setTurns([...history, { role: "assistant", content: result.text }]);
    } catch (err) {
      if (isUnauthorized(err)) {
        navigate({ to: "/login" });
        return;
      }
      setError(c.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask-desk">
      <header className="ask-head">
        <div>
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{c.title}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">{c.hint}</p>
        </div>
        <label className="ask-case">
          {c.matter}
          <select id="ask-matter" value={matter} onChange={(e) => onMatter(e.target.value)}>
            <option value="">{c.general}</option>
            {matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.caseNumber ? ` · ${m.caseNumber}` : ""}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="ask-thread" ref={threadRef} aria-live="polite">
        {turns.length === 0 ? <p className="ask-empty">{c.empty}</p> : null}
        {turns.map((turn, i) => {
          const mine = turn.role === "user";
          return (
            <article key={`${turn.role}-${i}`} className={`ask-turn ${mine ? "is-user" : "is-assistant"}`}>
              <span className="ask-who">{mine ? c.you : c.desk}</span>
              <div className={`ask-bubble ${mine ? "is-user" : "is-assistant"}`}>
                {mine ? turn.content : <AskMarkdown text={turn.content} />}
              </div>
            </article>
          );
        })}
        {busy ? <p className="ask-pending">{c.sending}</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}{" "}
          {error === c.paywall ? (
            <Link to="/billing" className="underline">
              {c.upgrade}
            </Link>
          ) : null}
        </p>
      ) : null}

      <form
        className="ask-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          rows={2}
          placeholder={c.placeholder}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button type="submit" disabled={busy || draft.trim().length < 2}>
          {busy ? c.sending : c.send}
        </Button>
      </form>
      <p className="ask-note">{c.disclaimer}</p>
    </div>
  );
}
