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
			isPending ? jsx("div", { className: "skeleton h-40" }) : null,
			!isPending && !user ? jsx(GuestPanel, { lang }) : null,
			!isPending && user ? jsxs("div", { children: [
				jsx("h1", {
					className: "page-title",
					children: c.diary
				}),
				jsx("p", {
					className: "page-lead",
					children: c.tagline
				}),
				hearings.length === 0 ? jsx("p", {
					className: "section-note stack-tight",
					children: c.emptyDiary
				}) : jsxs("div", {
					className: "space-y-10",
					children: [
						["today", hearings.filter((h) => h.listedOn === today)],
						["upcoming", hearings.filter((h) => h.listedOn > today)],
						["past", hearings.filter((h) => h.listedOn < today)]
					].filter(([, rows]) => rows.length > 0).map(([bucket, rows]) => jsxs("section", {
						className: "stack",
						children: [
							jsx("h2", {
								className: "section-title",
								children: bucket === "today" ? c.today : bucket === "upcoming" ? c.upcoming : c.diary
							}),
							jsx("ol", {
								className: "row-list",
								children: rows.map((h) => jsx("li", { children: jsx(Link, {
									to: "/matters/$id",
									params: { id: h.matterId },
									hash: h.id,
									className: "row grid gap-x-4 gap-y-1 sm:grid-cols-[7rem_minmax(0,1fr)]",
									children: [
										jsxs("div", {
											className: "flex items-baseline gap-2 sm:flex-col sm:gap-0.5",
											children: [
												jsx("span", {
													className: "text-xs font-medium tabular-nums text-accent",
													children: h.listedOn === today ? c.today : h.listedOn
												}),
												h.listedAt ? jsx("span", {
													className: "text-xs tabular-nums text-muted",
													children: h.listedAt
												}) : null
											]
										}, "when"),
										jsxs("div", {
											className: "min-w-0",
											children: [
												jsx("div", {
													className: "row-title",
													children: h.matterTitle
												}),
												jsxs("div", {
													className: "row-meta",
													children: [
														h.courtName ? jsx("span", { className: "truncate", children: h.courtName }, "court") : null,
														h.purpose ? jsx("span", { children: h.purpose }, "purpose") : null
													]
												}),
												h.outcome ? jsx("p", {
													className: "mt-1.5 text-xs leading-relaxed text-subtle",
													children: h.outcome
												}) : null
											]
										}, "what")
									]
								}) }, h.id))
							})
						]
					}, bucket))
				})
			] }) : null
		]
	});
}
