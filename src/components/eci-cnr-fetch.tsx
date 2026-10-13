import { useEffect, useId, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { refreshCounts } from "@/lib/app-events";
import { eciPartnerConfigured, fetchCnrToInbox } from "@/lib/eci-partner/store";
import type { FetchCnrResult } from "@/lib/eci-partner/types";
import { normalizeCnr, partnerCnrError } from "@/lib/eci-partner/cnr";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";
import { cn } from "@/lib/utils";

type Landed = Extract<FetchCnrResult, { ok: true }>;

export function cnrErrorCopy(c: ReturnType<typeof p>, result: Extract<FetchCnrResult, { ok: false }>): string {
  if (result.error === "TRIAL_LIMIT") return c.eciTrialLimit;
  if (result.error === "PROVIDER_DISABLED") return c.eciProviderOff;
  if (result.error === "API_KEY_MISSING") return c.eciKeyMissing;
  if (result.error === "SAMPLE_SKIPPED") return c.eciFetchError;
  if (result.error === "BLANK_CNR") return c.eciBlankCnr;
  if (result.error === "INVALID_CNR") return c.eciInvalidCnr;
  if (result.error === "EMPTY_PARSE") {
    return /PDF|converted/i.test(result.message) ? c.eciPdfPending : c.eciNeedsHuman;
  }
  if (result.code === "CASE_NOT_FOUND") return c.eciCaseNotFound;
  if (result.code === "RATE_LIMIT_EXCEEDED") return c.eciRateLimit;
  return result.message || c.eciFetchError;
}

let providerCache: { configured: boolean; providerId: string } | null = null;

/** Whether live court data is connected, cached for the session. */
export function useCourtDataStatus() {
  const [status, setStatus] = useState(providerCache);
  useEffect(() => {
    let live = true;
    eciPartnerConfigured()
      .then((row) => {
        providerCache = { configured: Boolean(row?.configured), providerId: String(row?.providerId ?? "") };
        if (live) setStatus(providerCache);
      })
      .catch(() => {
        if (live) setStatus({ configured: false, providerId: "" });
      });
    return () => {
      live = false;
    };
  }, []);
  return status;
}

/**
 * Pull a live case by CNR. Without a matter it opens a new file from the court
 * record; with one it syncs that file. Orders always land unconfirmed in Inbox.
 */
export function EciCnrFetch({
  lang,
  matterId,
  defaultCnr = "",
  size = "md",
  submitLabel,
  showLabel = true,
  onLanded,
}: {
  lang: OutputLang;
  matterId?: string;
  defaultCnr?: string;
  size?: "md" | "lg";
  submitLabel?: string;
  showLabel?: boolean;
  onLanded?: (result: Landed) => void;
}) {
  const c = p(lang);
  const id = useId();
  const status = useCourtDataStatus();
  const [cnr, setCnr] = useState(defaultCnr);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCnr(defaultCnr);
  }, [defaultCnr]);

  const offline = status !== null && (!status.configured || status.providerId === "none");
  const typed = normalizeCnr(cnr);

  async function onFetch() {
    const err = partnerCnrError(cnr);
    if (err) {
      setError(err === "BLANK_CNR" ? c.eciBlankCnr : c.eciInvalidCnr);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await fetchCnrToInbox({ data: { matterId, cnr } });
      if (!next.ok) {
        setError(cnrErrorCopy(c, next));
        return;
      }
      refreshCounts();
      toast.success(
        next.landed > 0
          ? c.eciLandedCount.replace("{n}", String(next.landed))
          : next.duplicates > 0
            ? c.eciUpToDate
            : c.eciLandedNone,
      );
      onLanded?.(next);
    } catch (err) {
      setError(err instanceof Error && !/unauthorized/i.test(err.message) ? err.message : c.eciFetchError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onFetch();
      }}
    >
      {showLabel ? <Label htmlFor={id}>{c.cnr}</Label> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          name="cnr"
          value={cnr}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={24}
          placeholder="DLHC010012342024"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setCnr(e.target.value);
            if (error) setError("");
          }}
          disabled={busy || offline}
          className={cn("mono uppercase tracking-wide placeholder:normal-case", size === "lg" && "h-11 text-[0.9375rem]")}
        />
        <Button type="submit" size={size === "lg" ? "lg" : "md"} disabled={busy || offline} className={size === "lg" ? "sm:min-w-36" : ""}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          {busy ? c.eciFetching : submitLabel ?? (matterId ? c.syncCase : c.eciFetchAction)}
        </Button>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <Hint id={`${id}-hint`}>
          {typed.length > 0 && typed.length !== 16
            ? c.eciCnrCount.replace("{n}", String(typed.length))
            : c.eciCnrHint}
        </Hint>
      )}
      {offline ? (
        <div className="callout is-warn mt-1" role="status">
          <CircleAlert className="size-4" aria-hidden />
          <span>{status?.providerId === "none" ? c.eciProviderOff : c.eciKeyMissing}</span>
        </div>
      ) : null}
    </form>
  );
}
