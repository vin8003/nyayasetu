import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { askChamber, listAskChats, openAskChat } from "@/lib/ask/store";
import { groupAskChats, type AskChatRow } from "@/lib/ask/threads";
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
    chats: "Chats",
    newChat: "New chat",
    noChats: "No saved chats yet.",
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
    chats: "बातचीत",
    newChat: "नई बात",
    noChats: "अभी कोई सहेजी बात नहीं।",
  },
} as const;

export function AskDesk({ lang, matterId, chatId }: { lang: OutputLang; matterId?: string; chatId?: string }) {
  const c = COPY[lang];
  const navigate = useNavigate();
  const [matters, setMatters] = useState<MatterHit[]>([]);
  const [chats, setChats] = useState<AskChatRow[]>([]);
  const [matter, setMatter] = useState(matterId ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const savedId = useRef(chatId ?? "");
  const groups = groupAskChats(chats, c.general);

  function refreshChats() {
    listAskChats()
      .then((rows) => setChats(rows))
      .catch((err) => {
        if (isUnauthorized(err)) navigate({ to: "/login" });
      });
  }

  useEffect(() => {
    listMatters()
      .then((rows) => setMatters(rows as MatterHit[]))
      .catch((err) => {
        if (isUnauthorized(err)) navigate({ to: "/login" });
      });
    refreshChats();
  }, [navigate]);

  useEffect(() => {
    if (!chatId) {
      savedId.current = "";
      setMatter(matterId ?? "");
      setTurns([]);
      setError("");
      return;
    }
    savedId.current = chatId;
    let cancel = false;
    openAskChat({ data: chatId })
      .then((chat) => {
        if (cancel || !chat) return;
        setMatter(chat.matterId ?? "");
        setTurns(chat.messages);
        setError("");
      })
      .catch((err) => {
        if (isUnauthorized(err)) navigate({ to: "/login" });
      });
    return () => {
      cancel = true;
    };
  }, [chatId, matterId, navigate]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  function onMatter(next: string) {
    savedId.current = "";
    setMatter(next);
    setTurns([]);
    setError("");
    navigate({ to: "/ask", search: { matter: next || undefined } });
  }

  function onNewChat() {
    savedId.current = "";
    setTurns([]);
    setError("");
    navigate({ to: "/ask", search: { matter: matter || undefined } });
  }

  function onOpenChat(row: AskChatRow) {
    navigate({ to: "/ask", search: { matter: row.matterId || undefined, chat: row.id } });
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
          chatId: savedId.current || undefined,
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
      savedId.current = result.chatId;
      refreshChats();
      if (result.chatId && result.chatId !== chatId) {
        navigate({ to: "/ask", search: { matter: matter || undefined, chat: result.chatId } });
      }
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

  const active = matters.find((row) => row.id === matter);
  const sheetTitle = active?.title || c.general;
  const sheetMeta = [active?.caseNumber, active?.courtName].filter(Boolean).join(" · ") || c.hint;

  return (
    <div className="ask-session">
      <aside className="ask-index" aria-label={c.chats}>
        <div className="ask-index-top">
          <div>
            <p className="ask-kicker">{c.title}</p>
            <p className="ask-index-note">{c.chats}</p>
          </div>
          <button type="button" className="ask-new" onClick={onNewChat}>
            {c.newChat}
          </button>
        </div>
        <label className="ask-case">
          <span>{c.matter}</span>
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
        <nav className="ask-index-list">
          {groups.length === 0 ? <p className="ask-rail-empty">{c.noChats}</p> : null}
          {groups.map((group) => (
            <section key={group.key} className={`ask-group${group.matterId === (matter || null) ? " is-open" : ""}`}>
              <h2>{group.label}</h2>
              <ul>
                {group.chats.map((row) => (
                  <li key={row.id}>
                    <button type="button" className={row.id === chatId ? "is-current" : ""} onClick={() => onOpenChat(row)}>
                      {row.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      <section className="ask-sheet" aria-label={sheetTitle}>
        <header className="ask-sheet-bar">
          <div>
            <h1>{sheetTitle}</h1>
            <p>{sheetMeta}</p>
          </div>
        </header>

        <div className="ask-transcript" ref={threadRef} aria-live="polite">
          {turns.length === 0 ? (
            <div className="ask-empty">
              <p className="ask-empty-mark">§</p>
              <p>{c.empty}</p>
            </div>
          ) : null}
          {turns.map((turn, i) => {
            const mine = turn.role === "user";
            return (
              <article key={`${turn.role}-${i}`} className={`ask-turn ${mine ? "is-user" : "is-note"}`}>
                <span className="ask-who">{mine ? c.you : c.desk}</span>
                <div className="ask-body">{mine ? turn.content : <AskMarkdown text={turn.content} />}</div>
              </article>
            );
          })}
          {busy ? (
            <p className="ask-pending">
              <span className="ask-pulse" aria-hidden="true" />
              {c.sending}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="ask-error" role="alert">
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
          <div className="ask-composer-row">
            <p className="ask-note">{c.disclaimer}</p>
            <Button type="submit" size="sm" disabled={busy || draft.trim().length < 2}>
              {busy ? "…" : c.send}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
