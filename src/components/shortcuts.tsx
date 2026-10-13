import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { openNewMatter, openPalette } from "@/lib/app-events";
import type { OutputLang } from "@/lib/research/types";

const SHOW = "cb:shortcuts";

export function openShortcuts() {
  window.dispatchEvent(new Event(SHOW));
}

/** Go-to targets for the two-key "G then …" sequences. */
const GO: Record<string, string> = { t: "/", d: "/diary", m: "/matters", r: "/research", i: "/inbox", a: "/ask" };

const COPY = {
  en: {
    title: "Keyboard shortcuts",
    close: "Close",
    groups: [
      {
        name: "Start",
        rows: [
          [["N"], "Bring in a case by CNR"],
          [["R"], "New research memo"],
          [["A"], "Ask a quick question"],
          [["/"], "Search matters and commands"],
          [["⌘", "K"], "Search from anywhere"],
        ],
      },
      {
        name: "Go to",
        rows: [
          [["G", "T"], "Today"],
          [["G", "D"], "Diary"],
          [["G", "M"], "Matters"],
          [["G", "R"], "Research"],
          [["G", "I"], "Inbox"],
          [["G", "A"], "Ask"],
        ],
      },
      {
        name: "Anywhere",
        rows: [
          [["?"], "Show this list"],
          [["Esc"], "Close a panel or menu"],
        ],
      },
    ],
  },
  hi: {
    title: "कीबोर्ड शॉर्टकट",
    close: "बंद करें",
    groups: [
      {
        name: "शुरू करें",
        rows: [
          [["N"], "CNR से केस लाएँ"],
          [["R"], "नया शोध मेमो"],
          [["A"], "छोटा सवाल पूछें"],
          [["/"], "मामले और कमांड खोजें"],
          [["⌘", "K"], "कहीं से भी खोजें"],
        ],
      },
      {
        name: "जाएँ",
        rows: [
          [["G", "T"], "आज"],
          [["G", "D"], "डायरी"],
          [["G", "M"], "मामले"],
          [["G", "R"], "शोध"],
          [["G", "I"], "इनबॉक्स"],
          [["G", "A"], "पूछें"],
        ],
      },
      {
        name: "कहीं भी",
        rows: [
          [["?"], "यह सूची दिखाएँ"],
          [["Esc"], "पैनल या मेन्यू बंद करें"],
        ],
      },
    ],
  },
} as const;

function typingIn(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function overlayOpen() {
  return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]'));
}

/** Single-key shortcuts for signed-in pages. Never fires while typing or with a panel open. */
export function KeyboardShortcuts({ lang, enabled }: { lang: OutputLang; enabled: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const c = COPY[lang];

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SHOW, show);
    return () => window.removeEventListener(SHOW, show);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let pendingGo = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (typingIn(e.target) || overlayOpen()) return;
      const key = e.key.toLowerCase();
      if (pendingGo && Date.now() - pendingGo < 1200 && GO[key]) {
        e.preventDefault();
        pendingGo = 0;
        navigate({ to: GO[key] } as never);
        return;
      }
      pendingGo = 0;
      if (key === "g") {
        pendingGo = Date.now();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
      } else if (key === "/") {
        e.preventDefault();
        openPalette();
      } else if (key === "n") {
        e.preventDefault();
        openNewMatter({ mode: "cnr" });
      } else if (key === "r") {
        e.preventDefault();
        navigate({ to: "/research", search: { matter: undefined, memo: undefined, view: undefined } });
      } else if (key === "a") {
        e.preventDefault();
        navigate({ to: "/ask", search: { matter: undefined, chat: undefined, memo: undefined } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, navigate]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog !w-[min(30rem,calc(100vw-2rem))]" aria-describedby={undefined}>
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="dialog-title">{c.title}</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label={c.close}>
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="mt-4 flex flex-col gap-5">
            {c.groups.map((group) => (
              <section key={group.name}>
                <h3 className="label-sm mb-1.5">{group.name}</h3>
                <dl className="flex flex-col">
                  {group.rows.map(([keys, label]) => (
                    <div key={label} className="flex items-center justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
                      <dt>{label}</dt>
                      <dd className="flex shrink-0 items-center gap-1">
                        {keys.map((k, i) => (
                          <kbd key={i} className="kbd min-w-6 justify-center">
                            {k}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
