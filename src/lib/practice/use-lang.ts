import { useEffect, useState } from "react";
import type { OutputLang } from "@/lib/research/types";
import { readLang, writeLang } from "./lang";

export function useChamberLang() {
	const [lang, setLang] = useState<OutputLang>("en");
	useEffect(() => {
		const next = readLang();
		setLang(next);
		document.documentElement.lang = next;
	}, []);
	function onLang(next: OutputLang) {
		setLang(next);
		writeLang(next);
		document.documentElement.lang = next;
	}
	return {
		lang,
		onLang
	};
}
