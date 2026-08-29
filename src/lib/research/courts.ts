export type CourtOption = {
  id: string;
  name: string;
  nameHi: string;
  kind: "all" | "sc" | "hc" | "tribunal";
};

export const COURTS: CourtOption[] = [
  { id: "all", name: "All Indian courts", nameHi: "सभी भारतीय अदालतें", kind: "all" },
  { id: "sc", name: "Supreme Court of India", nameHi: "भारत का सर्वोच्च न्यायालय", kind: "sc" },
  { id: "delhi", name: "Delhi High Court", nameHi: "दिल्ली उच्च न्यायालय", kind: "hc" },
  { id: "bombay", name: "Bombay High Court", nameHi: "बॉम्बे उच्च न्यायालय", kind: "hc" },
  { id: "calcutta", name: "Calcutta High Court", nameHi: "कलकत्ता उच्च न्यायालय", kind: "hc" },
  { id: "madras", name: "Madras High Court", nameHi: "मद्रास उच्च न्यायालय", kind: "hc" },
  { id: "allahabad", name: "Allahabad High Court", nameHi: "इलाहाबाद उच्च न्यायालय", kind: "hc" },
  { id: "rajasthan", name: "Rajasthan High Court", nameHi: "राजस्थान उच्च न्यायालय", kind: "hc" },
  { id: "punjab", name: "Punjab & Haryana High Court", nameHi: "पंजाब एवं हरियाणा उच्च न्यायालय", kind: "hc" },
  { id: "karnataka", name: "Karnataka High Court", nameHi: "कर्नाटक उच्च न्यायालय", kind: "hc" },
  { id: "kerala", name: "Kerala High Court", nameHi: "केरल उच्च न्यायालय", kind: "hc" },
  { id: "gujarat", name: "Gujarat High Court", nameHi: "गुजरात उच्च न्यायालय", kind: "hc" },
  { id: "mp", name: "Madhya Pradesh High Court", nameHi: "मध्य प्रदेश उच्च न्यायालय", kind: "hc" },
  { id: "patna", name: "Patna High Court", nameHi: "पटना उच्च न्यायालय", kind: "hc" },
  { id: "orissa", name: "Orissa High Court", nameHi: "उड़ीसा उच्च न्यायालय", kind: "hc" },
  { id: "andhra", name: "Andhra Pradesh High Court", nameHi: "आंध्र प्रदेश उच्च न्यायालय", kind: "hc" },
  { id: "telangana", name: "Telangana High Court", nameHi: "तेलंगाना उच्च न्यायालय", kind: "hc" },
  { id: "chhattisgarh", name: "Chhattisgarh High Court", nameHi: "छत्तीसगढ़ उच्च न्यायालय", kind: "hc" },
  { id: "jharkhand", name: "Jharkhand High Court", nameHi: "झारखंड उच्च न्यायालय", kind: "hc" },
  { id: "uttarakhand", name: "Uttarakhand High Court", nameHi: "उत्तराखंड उच्च न्यायालय", kind: "hc" },
  { id: "hp", name: "Himachal Pradesh High Court", nameHi: "हिमाचल प्रदेश उच्च न्यायालय", kind: "hc" },
  { id: "jk", name: "J&K and Ladakh High Court", nameHi: "जम्मू-कश्मीर एवं लद्दाख उच्च न्यायालय", kind: "hc" },
  { id: "gauhati", name: "Gauhati High Court", nameHi: "गुवाहाटी उच्च न्यायालय", kind: "hc" },
  { id: "manipur", name: "Manipur High Court", nameHi: "मणिपुर उच्च न्यायालय", kind: "hc" },
  { id: "meghalaya", name: "Meghalaya High Court", nameHi: "मेघालय उच्च न्यायालय", kind: "hc" },
  { id: "tripura", name: "Tripura High Court", nameHi: "त्रिपुरा उच्च न्यायालय", kind: "hc" },
  { id: "sikkim", name: "Sikkim High Court", nameHi: "सिक्किम उच्च न्यायालय", kind: "hc" },
  { id: "nclat", name: "NCLAT / NCLT", nameHi: "एनसीएलएटी / एनसीएलटी", kind: "tribunal" },
  { id: "itat", name: "ITAT", nameHi: "आईटीएटी", kind: "tribunal" },
  { id: "cat", name: "Central Administrative Tribunal", nameHi: "केंद्रीय प्रशासनिक अधिकरण", kind: "tribunal" },
];

export function courtById(id: string): CourtOption {
  return COURTS.find((c) => c.id === id) ?? COURTS[0];
}
