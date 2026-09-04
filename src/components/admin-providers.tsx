import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listCourtProviders, setActiveCourtProvider } from "@/lib/court-providers/store";
import type { CourtProviderId, CourtProviderStatus } from "@/lib/court-providers/types";

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
    </div>
  );
}
