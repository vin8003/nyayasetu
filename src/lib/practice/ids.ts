// @ts-nocheck
import type { Party } from "./types";

export function newId(prefix = "cb") {
	return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
export function todayISO(timeZone = "Asia/Kolkata") {
	return (new Date()).toLocaleDateString("en-CA", { timeZone });
}
export function addDaysISO(iso, days) {
	const [y, m, d] = iso.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() + days);
	return dt.toISOString().slice(0, 10);
}
export function parseParties(text) {
	return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
		const i = line.indexOf(",");
		if (i === -1) return {
			role: "party" as const,
			name: line
		};
		return {
			role: line.slice(0, i).trim() || "party",
			name: line.slice(i + 1).trim() || line
		};
	});
}
export function formatParties(parties) {
	return (parties ?? []).map((p) => `${p.role}, ${p.name}`.trim()).filter((line) => line && line !== ",").join("\n");
}
