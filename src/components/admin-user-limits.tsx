import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label } from "@/components/ui/field";
import { updateAdminUserLimits, type AdminUserRow } from "@/lib/admin/store";

export function AdminUserLimits({
  row,
  onSaved,
}: {
  row: AdminUserRow;
  onSaved: (next: AdminUserRow) => void;
}) {
  const [limit, setLimit] = useState(
    row.snap.cnrFetchLimit != null ? String(row.snap.cnrFetchLimit) : "",
  );
  const [extraDays, setExtraDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(resetFetches = false) {
    setBusy(true);
    setError(null);
    try {
      const trimmed = limit.trim();
      const next = await updateAdminUserLimits({
        data: {
          userId: row.id,
          cnrFetchLimit: trimmed === "" ? null : Number(trimmed),
          resetFetches,
          extraTrialDays: extraDays.trim() ? Number(extraDays) : 0,
        },
      });
      onSaved(next);
      setExtraDays("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update limits");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad mt-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-medium">Trial limits</h2>
        <p className="mt-1 text-sm text-muted">
          Used {row.snap.cnrFetchesUsed} of {row.snap.cnrFetchLimit} live CNR fetches
          {row.snap.cnrFetchesLeft == null ? " · paid, unlimited" : ` · ${row.snap.cnrFetchesLeft} left`}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="user-cnr-cap">CNR fetch cap</Label>
          <Input
            id="user-cnr-cap"
            type="number"
            min={0}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            disabled={busy}
            placeholder="Chamber default"
          />
          <Hint>Blank uses the chamber default.</Hint>
        </Field>
        <Field>
          <Label htmlFor="user-extra-days">Add trial days</Label>
          <Input
            id="user-extra-days"
            type="number"
            min={0}
            max={365}
            value={extraDays}
            onChange={(e) => setExtraDays(e.target.value)}
            disabled={busy}
            placeholder="0"
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void save(false)}>
          {busy ? "Saving…" : "Save limits"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save(true)}>
          Reset fetch count
        </Button>
      </div>
    </div>
  );
}
