import type { CourtSource } from "./types.ts";
import { districtLookupError, highCourtLookupError } from "./validate.ts";

export const DISTRICT_ECOURTS_ID = "district-ecourts";
export const DELHI_HC_ID = "delhi-hc";

export const COURT_SOURCES: CourtSource[] = [
  {
    id: DISTRICT_ECOURTS_ID,
    name: "District courts (eCourts)",
    nameHi: "जिला न्यायालय (ई-कोर्ट्स)",
    kind: "district",
    officialUrl: "https://webapi.ecourtsindia.com",
    officialName: "Court-data API",
    fields: [
      {
        id: "cnr",
        label: "CNR",
        labelHi: "CNR",
        required: false,
        placeholder: "DLND010012342025",
        hint: "16-character CNR. If you have it, the other fields can stay empty.",
        hintHi: "16 अक्षर का CNR। अगर है तो बाकी फ़ील्ड खाली रह सकते हैं।",
      },
      {
        id: "caseType",
        label: "Case type",
        labelHi: "केस प्रकार",
        required: false,
        placeholder: "CS",
      },
      {
        id: "caseNumber",
        label: "Case number",
        labelHi: "केस नंबर",
        required: false,
        placeholder: "184",
      },
      {
        id: "year",
        label: "Year",
        labelHi: "वर्ष",
        required: false,
        placeholder: "2025",
      },
    ],
    demoHint: "Try CNR DLND010012342025 for a published demo reconstruction. Live cases need a CNR via the court-data API — CiteBench does not open the court CAPTCHA page.",
    demoHintHi: "प्रकाशित डेमो पुनर्रचना के लिए CNR DLND010012342025 आज़माएँ। लाइव केस court-data API से CNR से आते हैं — कैप्चा साइट नहीं खुलती।",
  },
  {
    id: DELHI_HC_ID,
    name: "Delhi High Court",
    nameHi: "दिल्ली उच्च न्यायालय",
    kind: "high_court",
    officialUrl: "https://webapi.ecourtsindia.com",
    officialName: "Court-data API",
    fields: [
      {
        id: "caseType",
        label: "Case type",
        labelHi: "केस प्रकार",
        required: true,
        placeholder: "W.P.(C)",
      },
      {
        id: "caseNumber",
        label: "Case number",
        labelHi: "केस नंबर",
        required: true,
        placeholder: "3312",
      },
      {
        id: "year",
        label: "Year",
        labelHi: "वर्ष",
        required: true,
        placeholder: "2025",
      },
    ],
    demoHint: "Try W.P.(C) 3312 / 2025 for the published demo. Live Delhi matters fetch by CNR through the court-data API.",
    demoHintHi: "प्रकाशित डेमो के लिए W.P.(C) 3312 / 2025 आज़माएँ। लाइव दिल्ली मामले CNR से court-data API से आते हैं।",
  },
];

export function courtSourceById(id: string): CourtSource | undefined {
  return COURT_SOURCES.find((c) => c.id === id);
}

export function validateCourtLookup(courtId: string, lookup: Record<string, string>) {
  if (courtId === DISTRICT_ECOURTS_ID) {
    const error = districtLookupError(lookup);
    return error ? ({ ok: false as const, error }) : ({ ok: true as const });
  }
  if (courtId === DELHI_HC_ID) {
    const error = highCourtLookupError(lookup);
    return error ? ({ ok: false as const, error }) : ({ ok: true as const });
  }
  return { ok: false as const, error: "Unknown court source." };
}
