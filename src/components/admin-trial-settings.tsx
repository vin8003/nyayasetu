import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label } from "@/components/ui/field";
import { getAdminTrialDefaults, saveAdminTrialDefaults } from "@/lib/admin/store";

export function AdminTrialSettings() {
  const [days, setDays] = useState("30");
  const [fetches, setFetches] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAdminTrialDefaults()
      .then((next) => {
        setDays(String(next.trialDays));
        setFetches(String(next.trialCnrFetches));
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load trial defaults"));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next = await saveAdminTrialDefaults({
        data: { trialDays: Number(days), trialCnrFetches: Number(fetches) },
      });
      setDays(String(next.trialDays));
      setFetches(String(next.trialCnrFetches));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save trial defaults");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && !error) return <div className="skeleton h-32" />;

  return (
    <form
      className="card card-pad mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <h2 className="font-display text-lg font-medium">Trial defaults</h2>
        <p className="mt-1 text-sm text-muted">
          New trials last this many days or this many live CNR fetches, whichever comes first.
          Existing users keep their current end date unless you reset them.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="trial-days">Trial days</Label>
          <Input
            id="trial-days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={busy}
          />
        </Field>
        <Field>
          <Label htmlFor="trial-cnr">Live CNR fetches</Label>
          <Input
            id="trial-cnr"
            type="number"
            min={0}
            max={1000}
            value={fetches}
            onChange={(e) => setFetches(e.target.value)}
            disabled={busy}
          />
          <Hint>Sample chamber does not count. Paid chambers are unlimited.</Hint>
        </Field>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save trial defaults"}
      </Button>
    </form>
  );
}
