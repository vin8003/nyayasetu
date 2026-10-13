import { LangToggle } from "@/components/lang-toggle";
import { Button } from "@/components/ui/button";
import type { OutputLang } from "@/lib/research/types";

const COPY = {
  en: {
    title: "A case file that keeps itself current.",
    lead: "Enter a CNR and CiteBench pulls the case and its orders. Confirm the directions and your diary, deadlines and tasks follow. Research and drafts cite only authorities that were actually retrieved.",
    create: "Create a free account",
    signIn: "Sign in",
    trial: "30 days or 10 live CNR fetches free, whichever comes first. No card.",
    points: [
      ["Diary", "Every listing across your matters, today first, with the purpose and the room."],
      ["Order inbox", "Directions and next dates are read out of each order. Nothing reaches the file until you confirm."],
      ["Research", "Facts in, a memo out: issues, statutes, and precedents checked against Indian Kanoon, SCI and eSCR."],
      ["Drafts", "Notices, replies, petitions and written statements built from the memo and saved to the file."],
    ],
    language: "Language",
    gate: "Sign in to see this page",
    gateLead: "Your diary, matters and inbox are private to your account.",
  },
  hi: {
    title: "केस फ़ाइल जो खुद अपडेट रहती है।",
    lead: "CNR डालें, CiteBench केस और उसके आदेश लाता है। निर्देशों की पुष्टि करें, और डायरी, समय-सीमा और कार्य अपने आप बनते हैं। शोध और ड्राफ्ट में केवल वही नज़ीरें होती हैं जिनका स्रोत सच में मिला।",
    create: "मुफ़्त अकाउंट बनाएँ",
    signIn: "लॉगिन",
    trial: "30 दिन या 10 लाइव CNR मुफ़्त, जो पहले हो। कार्ड नहीं चाहिए।",
    points: [
      ["डायरी", "सभी मामलों की पेशियाँ, आज की सबसे ऊपर, उद्देश्य और कोर्ट रूम के साथ।"],
      ["आदेश इनबॉक्स", "हर आदेश से निर्देश और अगली तारीख निकलती है। आपकी पुष्टि के बिना फ़ाइल नहीं बदलती।"],
      ["शोध", "तथ्य दें, मेमो पाएँ: मुद्दे, धाराएँ, और Indian Kanoon, SCI व eSCR पर जाँची नज़ीरें।"],
      ["ड्राफ्ट", "मेमो से नोटिस, जवाब, याचिका और लिखित कथन, सीधे फ़ाइल पर सेव।"],
    ],
    language: "भाषा",
    gate: "यह पेज देखने के लिए लॉगिन करें",
    gateLead: "आपकी डायरी, मामले और इनबॉक्स केवल आपके अकाउंट में रहते हैं।",
  },
} as const;

/** Signed-out view. The full pitch on Today; a short gate everywhere else. */
export function GuestPanel({
  lang,
  onLang,
  variant = "gate",
}: {
  lang: OutputLang;
  onLang?: (next: OutputLang) => void;
  variant?: "landing" | "gate";
}) {
  const c = COPY[lang];

  if (variant === "gate") {
    return (
      <div className="empty max-w-xl">
        <p className="empty-title">{c.gate}</p>
        <p className="empty-text">{c.gateLead}</p>
        <div className="empty-actions">
          <Button asChild>
            <a href="/login">{c.signIn}</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="landing">
      <h1 className="landing-title">{c.title}</h1>
      <p className="landing-lead">{c.lead}</p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <a href="/login?mode=register">{c.create}</a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="/login">{c.signIn}</a>
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted">{c.trial}</p>
      <dl className="landing-grid">
        {c.points.map(([title, body]) => (
          <div key={title}>
            <dt>
              <h2>{title}</h2>
            </dt>
            <dd>
              <p>{body}</p>
            </dd>
          </div>
        ))}
      </dl>
      {onLang ? (
        <div className="mt-10">
          <LangToggle lang={lang} onLang={onLang} ariaLabel={c.language} />
        </div>
      ) : null}
    </section>
  );
}
