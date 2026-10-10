import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { diagnoseIndianKanoon, listCourtProviders, setActiveCourtProvider } from "@/lib/court-providers/store";
import type { CourtProviderId, CourtProviderStatus } from "@/lib/court-providers/types";
import type { IkDiagnosis } from "@/lib/indiankanoon/diagnose";

function IkDiagnoseCard() {
  const [cnr, setCnr] = useState("DLHC010384862026");
  const [report, setReport] = useState<IkDiagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      setReport(await diagnoseIndianKanoon({ data: { cnr } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="card card-pad mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <div>
        <h2 className="font-medium">Test Indian Kanoon connection</h2>
        <p className="mt-1 text-sm text-muted">
          Checks where this server's requests leave from and whether Indian Kanoon answers. Costs one search and
          at most one document on the Indian Kanoon account. Nothing is saved.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-56 font-mono"
          value={cnr}
          onChange={(e) => setCnr(e.target.value)}
          aria-label="CNR to test"
          maxLength={40}
        />
        <Button type="submit" disabled={busy || !cnr.trim()}>
          {busy ? "Testing…" : "Run test"}
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {report ? (
        <div className="space-y-3">
          <p className="text-sm">{report.verdict}</p>
          <table className="w-full text-left text-xs">
            <thead className="text-subtle">
              <tr>
                <th className="py-1 pr-3 font-normal">Step</th>
                <th className="py-1 pr-3 font-normal">Result</th>
                <th className="py-1 pr-3 font-normal">ms</th>
                <th className="py-1 font-normal">Detail</th>
              </tr>
            </thead>
            <tbody>
              {report.steps.map((row) => (
                <tr key={row.name} className="align-top">
                  <td className="py-1 pr-3 font-mono">{row.name}</td>
                  <td className={`py-1 pr-3 ${row.ok ? "text-accent" : "text-danger"}`}>
                    {row.ok ? "ok" : "failed"}
                    {row.status ? ` · ${row.status}` : ""}
                    {row.code ? ` · ${row.code}` : ""}
                  </td>
                  <td className="py-1 pr-3 tabular-nums">{row.ms}</td>
                  <td className="py-1 break-words">
                    {row.detail}
                    {row.attempts?.length ? (
                      <span className="mt-0.5 block font-mono text-subtle">
                        {row.attempts.map((a) => `${a.via}#${a.round}=${a.code ?? a.status}/${a.ms}ms`).join("  ")}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            type="button"
            variant="outline"
            onClick={() => void navigator.clipboard?.writeText(JSON.stringify(report, null, 2))}
          >
            Copy report
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function AdminProvidersPane() {
  const [rows, setRows] = useState<CourtProviderStatus[] | null>(null);
  const [activeId, setActiveId] = useState<CourtProviderId>("eci_partner");
  const [pick, setPick] = useState<CourtProviderId>("eci_partner");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCourtProviders()
      .then((next) => {
        setRows(next.providers);
        setActiveId(next.activeId);
        setPick(next.activeId);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load providers"));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await setActiveCourtProvider({ data: { id: pick } });
      setRows(next.providers);
      setActiveId(next.activeId);
      setPick(next.activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save provider");
    } finally {
      setBusy(false);
    }
  }

  if (error && !rows) return <p className="text-sm text-danger">{error}</p>;
  if (!rows) return <div className="skeleton h-40" />;

  return (
    <div>
      <p className="eyebrow">Chamber</p>
      <h1 className="page-title">Court data</h1>
      <p className="page-lead">
        One provider for every chamber. CNR fetch uses this adapter only — never the official eCourts
        CAPTCHA page.
      </p>
      <form
        className="card card-pad mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {rows.map((row) => (
          <label
            key={row.id}
            className={`flex cursor-pointer gap-3 rounded-md p-3 shadow-hairline ${
              pick === row.id ? "bg-elevated" : "bg-surface"
            }`}
          >
            <input
              type="radio"
              name="court-provider"
              className="mt-1"
              checked={pick === row.id}
              disabled={!row.selectable || busy}
              onChange={() => setPick(row.id)}
            />
            <span>
              <span className="block font-medium">
                {row.name}
                {row.active ? (
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-accent">Active</span>
                ) : null}
              </span>
              <span className="mt-1 block text-sm text-muted">{row.summary}</span>
              {row.id !== "none" ? (
                <span className="mt-1 block text-xs text-subtle">
                  Credentials {row.configured ? "are set on the server" : "are not configured"}
                </span>
              ) : null}
            </span>
          </label>
        ))}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || pick === activeId}>
            {busy ? "Saving…" : "Use this provider"}
          </Button>
          {pick === activeId ? <p className="text-xs text-muted">Already active.</p> : null}
        </div>
        <p className="text-xs text-muted">
          Switching here applies to every lawyer in the chamber. Confirm still stays with the lawyer.
        </p>
      </form>
      <IkDiagnoseCard />
    </div>
  );
}
