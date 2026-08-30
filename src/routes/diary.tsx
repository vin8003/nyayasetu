// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { p } from "@/lib/practice/copy";
import { todayISO } from "@/lib/practice/ids";
import { listHearingsRange } from "@/lib/practice/store";
import type { Hearing } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";

export const Route = createFileRoute("/diary")({ component: DiaryPage });

export function DiaryPage() {
	const { lang, onLang } = useChamberLang();
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const [hearings, setHearings] = useState<Hearing[]>([]);
	const c = p(lang);
	const today = todayISO();
	useEffect(() => {
		if (!user) return;
		listHearingsRange().then(setHearings).catch((err) => {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
		});
	}, [user, navigate]);
	return jsxs(AppShell, {
		lang,
		onLang,
		active: "diary",
		children: [
			isPending ? jsx("div", { className: "h-40 animate-pulse rounded-xl bg-elevated" }) : null,
			!isPending && !user ? jsx(GuestPanel, { lang }) : null,
			!isPending && user ? jsxs("div", { children: [
				jsx("h1", {
					className: "font-display text-4xl tracking-tight",
					children: c.diary
				}),
				jsx("p", {
					className: "mt-2 text-muted",
					children: c.tagline
				}),
				hearings.length === 0 ? jsx("p", {
					className: "mt-8 text-sm text-muted",
					children: c.emptyDiary
				}) : jsxs("div", {
					className: "mt-8 space-y-8",
					children: [
						["today", hearings.filter((h) => h.listedOn === today)],
						["upcoming", hearings.filter((h) => h.listedOn > today)],
						["past", hearings.filter((h) => h.listedOn < today)]
					].filter(([, rows]) => rows.length > 0).map(([bucket, rows]) => jsxs("section", {
						children: [
							jsx("h2", {
								className: "font-display text-2xl",
								children: bucket === "today" ? c.today : bucket === "upcoming" ? c.upcoming : c.diary
							}),
							jsx("ol", {
								className: "mt-3 space-y-2",
								children: rows.map((h) => jsx("li", { children: jsx(Link, {
									to: "/matters/$id",
									params: { id: h.matterId },
									hash: h.id,
									className: "flex items-start justify-between gap-3 rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:bg-elevated",
									children: jsxs("div", { children: [
										jsx("div", {
											className: "text-xs tabular-nums text-accent",
											children: h.listedOn === today ? c.today : h.listedOn
										}),
										jsx("div", {
											className: "mt-1 font-medium",
											children: h.matterTitle
										}),
										jsxs("div", {
											className: "mt-1 text-sm text-muted",
											children: [
												h.listedAt,
												" ",
												h.courtName,
												" ",
												h.purpose
											]
										}),
										h.outcome ? jsx("div", {
											className: "mt-1 text-xs text-subtle",
											children: h.outcome
										}) : null
									] })
								}) }, h.id))
							})
						]
					}, bucket))
				})
			] }) : null
		]
	});
}
