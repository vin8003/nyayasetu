import { useState, type FormEvent } from "react";
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

  return (
    <main className="shell grid min-h-dvh place-items-center px-4 py-10">
      <div className="stagger-in w-full max-w-sm">
        <div className="mb-9 flex items-center justify-between">
          <Link to="/" className="brand">
            <CiteMark className="size-8" />
            <span className="brand-word text-xl">CiteBench</span>
          </Link>
          <LangToggle
            lang={lang}
            onLang={(next) => setLang(next)}
            ariaLabel={hi ? "भाषा" : "Language"}
          />
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight">
          {mode === "in" ? (hi ? "लॉगिन" : "Sign in") : hi ? "खाता बनाएँ" : "Create account"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {hi
            ? "केस हिस्ट्री आपके अकाउंट पर सुरक्षित रहेगी — Google, X या ईमेल, हर लॉगिन का अपना रिकॉर्ड।"
            : "Case history is saved on the account you sign in with — Google, X, or email each keep their own memos."}
        </p>
        <p className="mt-2 text-sm text-muted">
          {hi ? "30 दिन आज़माइश। कार्ड नहीं चाहिए।" : "30-day trial. No card required."}
        </p>
        <p className="mt-4">
          <Link to="/story" search={{ lang: hi ? "hi" : undefined }} className="link-accent text-sm">
            {hi ? "शोध डेस्क से चैंबर तक — पहले दिन की कहानी" : "From a research desk to a chamber — the first-day story"}
          </Link>
        </p>
        <div className="card card-pad mt-8">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="username">{hi ? "यूज़रनेम / ईमेल" : "Username / email"}</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={hi ? "आपका ईमेल या यूज़रनेम" : "Your email or username"}
              disabled={busy}
            />
            <Hint>
              {hi
                ? "पूरा ईमेल या सिर्फ़ यूज़रनेम — @ की ज़रूरत नहीं।"
                : "Full email or a username — no @ needed."}
            </Hint>
          </Field>
          <Field>
            <Label htmlFor="password">{hi ? "पासवर्ड" : "Password"}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </Field>
          {error ? (
            <p className="rounded-md bg-danger/12 px-3.5 py-3 text-sm leading-relaxed text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy
              ? hi
                ? "रुकिए…"
                : "Please wait…"
              : mode === "in"
                ? hi
                  ? "अंदर जाएँ"
                  : "Sign in"
                : hi
                  ? "खाता बनाएँ"
                  : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="link-quiet mt-4 text-sm"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
          }}
        >
          {mode === "in"
            ? hi
              ? "नया अकाउंट चाहिए? रजिस्टर करें"
              : "Need an account? Register"
            : hi
              ? "पहले से अकाउंट है? लॉगिन करें"
              : "Already registered? Sign in"}
        </button>
        {authEnabled ? (
          <>
            <div className="mt-8 flex items-center gap-3">
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
          <p className="mt-8 text-sm text-muted">{hi ? "लॉगिन अभी बंद है।" : "Sign-in is disabled."}</p>
        )}
        </div>
      </div>
    </main>
  );
}
