import { useState, type FormEvent } from "react";
import { BookOpen, CalendarDays, Eye, EyeOff, Inbox } from "lucide-react";
import { Link, createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { chambersAuth } from "@/lib/seed-user";
import { AdminDesk } from "@/components/admin-desk";
import { CiteMark } from "@/components/cite-mark";
import { LangToggle } from "@/components/lang-toggle";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label } from "@/components/ui/field";

type LoginSearch = { desk?: "1" };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    desk: search.desk === "1" || search.desk === 1 || search.desk === true ? "1" : undefined,
  }),
  component: Login,
});

function stashToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

function friendlyError(message: string, hi: boolean) {
  const m = message.toLowerCase();
  if (m.includes("invalid email") || m.includes("invalid password") || m.includes("user not found")) {
    return hi
      ? "यूज़रनेम या पासवर्ड गलत है। नया अकाउंट है तो एक बार रजिस्टर करें।"
      : "Username or password is wrong. New here? Register once.";
  }
  if (m.includes("already exists") || m.includes("already registered")) {
    return hi ? "यह अकाउंट पहले से है — लॉगिन करें।" : "That account already exists — sign in.";
  }
  if (m.includes("invalid origin")) {
    return hi
      ? "लॉगिन इस पेज से नहीं खुल पाया। पेज रिफ्रेश करके फिर कोशिश करें।"
      : "Sign-in was blocked for this page. Refresh and try again.";
  }
  return message;
}

function Login() {
  const { desk } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [lang, setLang] = useState<"hi" | "en">("en");

  const hi = lang === "hi";

  if (desk === "1") return <AdminDesk />;

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-fg">
        <div className="h-10 w-48 skeleton" />
      </main>
    );
  }
  if (user) return <Navigate to="/" />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || password.length < 8) {
      setError(
        hi
          ? "यूज़रनेम और कम से कम 8 अक्षर का पासवर्ड चाहिए।"
          : "Username and a password of at least 8 characters are required.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await chambersAuth({
        data: { username, password, mode },
      });
      if (!result.ok) throw new Error(result.error || "Sign in failed");
      if (!result.token) throw new Error("Sign in failed");
      stashToken(result.token);
      try {
        await authClient.getSession();
      } catch {
        /* bearer is in sessionStorage — a full load will pick it up */
      }
      window.location.assign("/");
      return;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed";
      setError(friendlyError(raw, hi));
    } finally {
      setBusy(false);
    }
  }

  const points = [
    {
      icon: CalendarDays,
      title: hi ? "डायरी और समय-सीमाएँ" : "Diary and deadlines",
      body: hi ? "हर पेशी और क्लॉक एक जगह — आज क्या करना है, साफ़ दिखता है।" : "Every hearing and limitation clock in one place, so today is never a surprise.",
    },
    {
      icon: BookOpen,
      title: hi ? "स्रोत-सहित शोध" : "Research with sources",
      body: hi ? "सुप्रीम कोर्ट और हाईकोर्ट के फ़ैसले, हर उद्धरण के लिंक के साथ।" : "Supreme Court and High Court rulings, every citation linked to its source.",
    },
    {
      icon: Inbox,
      title: hi ? "आदेश पढ़ना" : "Order reading",
      body: hi ? "आदेश पेस्ट करें — मॉडल निकालता है, आप पुष्टि करते हैं।" : "Paste an order. The model extracts; you confirm.",
    },
  ];

  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link to="/" className="brand">
          <CiteMark className="size-9" />
          <span className="brand-word">CiteBench</span>
        </Link>
        <div>
          <h2 className="auth-aside-title">
            {hi ? "आपका चैंबर, व्यवस्थित।" : "Your chamber, in order."}
          </h2>
          <ul className="auth-points">
            {points.map((pt) => (
              <li key={pt.title}>
                <span className="auth-point-icon" aria-hidden>
                  <pt.icon className="size-[1.1rem]" />
                </span>
                <span>
                  <strong>{pt.title}</strong>
                  <span>{pt.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Link to="/story" search={{ lang: hi ? "hi" : undefined }} className="auth-story-link">
          {hi ? "पहले दिन की कहानी पढ़ें →" : "Read the first-day story →"}
        </Link>
      </aside>

      <section className="auth-main">
        <div className="stagger-in w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="brand auth-brand-mobile">
              <CiteMark className="size-8" />
              <span className="brand-word">CiteBench</span>
            </Link>
            <LangToggle
              lang={lang}
              onLang={(next) => setLang(next)}
              ariaLabel={hi ? "भाषा" : "Language"}
              className="ml-auto"
            />
          </div>

          <h1 className="font-display text-3xl font-medium tracking-tight">
            {mode === "in" ? (hi ? "वापसी पर स्वागत" : "Welcome back") : hi ? "खाता बनाएँ" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {hi ? "30 दिन आज़माइश। कार्ड नहीं चाहिए।" : "30-day trial. No card required."}
          </p>

          <div role="tablist" className="seg seg-fill mt-6">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={"seg-btn" + (mode === m ? " is-on" : "")}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
              >
                {m === "in" ? (hi ? "लॉगिन" : "Sign in") : hi ? "रजिस्टर" : "Register"}
              </button>
            ))}
          </div>

          <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
            <Field>
              <Label htmlFor="username">{hi ? "यूज़रनेम / ईमेल" : "Username / email"}</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={hi ? "आपका ईमेल या यूज़रनेम" : "Your email or username"}
                disabled={busy}
              />
            </Field>
            <Field>
              <Label htmlFor="password">{hi ? "पासवर्ड" : "Password"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? (hi ? "पासवर्ड छुपाएँ" : "Hide password") : hi ? "पासवर्ड दिखाएँ" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-fg"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Hint>{hi ? "कम से कम 8 अक्षर।" : "At least 8 characters."}</Hint>
            </Field>
            {error ? (
              <p className="rounded-md bg-danger/12 px-3.5 py-3 text-sm leading-relaxed text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy
                ? hi ? "रुकिए…" : "Please wait…"
                : mode === "in"
                  ? hi ? "अंदर जाएँ" : "Sign in"
                  : hi ? "खाता बनाएँ" : "Create account"}
            </Button>
          </form>

          {authEnabled ? (
            <>
              <div className="mt-6 flex items-center gap-3">
                <span className="hairline flex-1" />
                <span className="text-xs text-subtle">{hi ? "या" : "or"}</span>
                <span className="hairline flex-1" />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                  >
                    {hi ? `${p.label} से जारी रखें` : `Continue with ${p.label}`}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">{hi ? "लॉगिन अभी बंद है।" : "Sign-in is disabled."}</p>
          )}
          <p className="mt-6 text-xs leading-relaxed text-subtle">
            {hi
              ? "केस हिस्ट्री उसी अकाउंट पर सुरक्षित रहती है जिससे आप लॉगिन करते हैं।"
              : "Case history is saved on the account you sign in with."}
          </p>
        </div>
      </section>
    </main>
  );
}
