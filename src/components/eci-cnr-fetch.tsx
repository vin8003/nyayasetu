import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label } from "@/components/ui/field";
import { eciPartnerConfigured, fetchCnrToInbox } from "@/lib/eci-partner/store";
import type { FetchCnrResult } from "@/lib/eci-partner/types";
import { isFirstStateCnr, partnerCnrError } from "@/lib/eci-partner/cnr";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";

function errorCopy(c: ReturnType<typeof p>, result: Extract<FetchCnrResult, { ok: false }>): string {
  if (result.error === "PROVIDER_DISABLED") return c.eciProviderOff;
  if (result.error === "API_KEY_MISSING") return c.eciKeyMissing;
  if (result.error === "SAMPLE_SKIPPED") return c.eciSkipSample;
  if (result.error === "BLANK_CNR") return c.eciBlankCnr;
  if (result.error === "INVALID_CNR") return c.eciInvalidCnr;
  if (result.error === "EMPTY_PARSE") {
    return /PDF|converted/i.test(result.message) ? c.eciPdfPending : c.eciNeedsHuman;
  }
  if (result.code === "CASE_NOT_FOUND") return c.eciCaseNotFound;
  if (result.code === "RATE_LIMIT_EXCEEDED") return c.eciRateLimit;
  return result.message || c.eciFetchError;
}

export function EciCnrFetch({
  lang,
  matterId,
  defaultCnr = "",
  compact = false,
  sample = false,
  onLanded,
}: {
  lang: OutputLang;
  matterId?: string;
  defaultCnr?: string;
  compact?: boolean;
  sample?: boolean;
  onLanded?: (result: Extract<FetchCnrResult, { ok: true }>) => void;
}) {
  const c = p(lang);
  const [cnr, setCnr] = useState(defaultCnr);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [providerName, setProviderName] = useState("");
  const [providerId, setProviderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FetchCnrResult | null>(null);

  useEffect(() => {
    setCnr(defaultCnr);
  }, [defaultCnr]);

  useEffect(() => {
    let live = true;
    eciPartnerConfigured()
      .then((row) => {
        if (live) {
          setConfigured(Boolean(row?.configured));
          setProviderName(String(row?.providerName ?? ""));
          setProviderId(String(row?.providerId ?? ""));
        }
      })
      .catch(() => {
        if (live) setConfigured(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function onFetch() {
    const err = partnerCnrError(cnr);
    if (err === "BLANK_CNR") {
      toast.error(c.eciBlankCnr);
      return;
    }
    if (err === "INVALID_CNR") {
      toast.error(c.eciInvalidCnr);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const next = await fetchCnrToInbox({ data: { matterId, cnr } });
      setResult(next);
      if (!next.ok) {
        toast.error(errorCopy(c, next));
        return;
      }
      toast.success(
        `${c.eciLanded}: ${next.landed}` + (next.duplicates ? ` · ${c.eciDuplicates}: ${next.duplicates}` : ""),
      );
      onLanded?.(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.eciFetchError);
    } finally {
      setBusy(false);
    }
  }

  if (sample) {
    return <p className="text-sm text-muted">{c.eciSkipSample}</p>;
  }

  const providerOff = providerId === "none";
  const keyMissing = configured === false && !providerOff;
  const blocked = configured === false;
  const outside = cnr.trim() && !partnerCnrError(cnr) && !isFirstStateCnr(cnr);

  return (
    <div className={compact ? "space-y-3" : "space-y-3 rounded-lg bg-elevated p-4 shadow-hairline"}>
      <div>
        <h2 className="section-title">{c.eciFetchTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{c.eciFetchHint}</p>
        {providerName ? <p className="mt-1 text-xs text-subtle">{providerName}</p> : null}
        <p className="mt-1 text-xs text-subtle">{c.eciFetchScope}</p>
      </div>
      {providerOff ? (
        <p className="text-sm text-warn" role="status">
          {c.eciProviderOff}
        </p>
      ) : null}
      {keyMissing ? (
        <p className="text-sm text-warn" role="status">
          {c.eciKeyMissing}
        </p>
      ) : null}
      <Field>
        <Label htmlFor={compact ? "eci-cnr-compact" : "eci-cnr"}>{c.eciFetchCnr}</Label>
        <Input
          id={compact ? "eci-cnr-compact" : "eci-cnr"}
          value={cnr}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="RJJP010000012025"
          onChange={(e) => setCnr(e.target.value)}
          disabled={busy || blocked}
        />
        <Hint>{c.eciUnconfirmedNote}</Hint>
      </Field>
      {outside ? <p className="text-xs text-muted">{c.eciFetchScope}</p> : null}
      <Button type="button" onClick={() => void onFetch()} disabled={busy || blocked}>
        {busy ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            {c.eciFetching}
          </>
        ) : (
          c.eciFetchAction
        )}
      </Button>
      {result?.ok ? (
        <div className="space-y-1 text-sm">
          <p>
            {c.eciLanded}: {result.landed}
            {result.duplicates ? ` · ${c.eciDuplicates}: ${result.duplicates}` : ""}
            {result.failed ? ` · ${c.recordsUnavailable}: ${result.failed}` : ""}
            {result.needsHuman ? ` · ${c.eciNeedsHuman}` : ""}
          </p>
          <p className="text-xs text-muted">{c.eciUnconfirmedNote}</p>
          <Link to="/inbox" search={{ matter: result.matterId }} className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
            {c.eciOpenInbox}
          </Link>
        </div>
      ) : null}
      {result && !result.ok ? (
        <p className="text-sm text-warn" role="status">
          {errorCopy(c, result)}
        </p>
      ) : null}
    </div>
  );
}
