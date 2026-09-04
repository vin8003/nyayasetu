export function importLog(stage: string, payload: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/body|text|document|orderText|paste/i.test(key)) {
      safe[key] = typeof value === "string" ? `<${value.length} chars>` : "[redacted]";
      continue;
    }
    safe[key] = value;
  }
  console.info("[court-import]", stage, JSON.stringify(safe));
}
