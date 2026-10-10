/** Indian drafting conventions shared by the letter drafter and the task drafter. */
export const DRAFTING_CONVENTIONS = {
  notice:
    "Legal notice: number the paragraphs; state the client's instructions, the facts with dates, the legal basis, a specific demand (amount, act or omission) and a fixed period to comply (e.g. 15 days of receipt), and the consequence of non-compliance. If the State or a public officer is the addressee, frame it as a notice under s.80 CPC (two months). For a dishonoured cheque, follow s.138 NI Act: cheque details, return memo date, demand of the cheque amount within 15 days of receipt.",
  reply:
    "Reply to notice: say it is issued without prejudice; deal with the notice para-wise ('The contents of para 3 are denied for want of knowledge / as false'); state the client's version and stand; reject the demand and reserve rights. No demand of your own unless instructed, no verification.",
  petition:
    "Court petition: cause title, then 'MOST RESPECTFULLY SHOWETH', numbered paragraphs of facts with dates, numbered GROUNDS (A, B, C…) each tying a fact to law, maintainability and limitation, a PRAYER with lettered clauses ((a), (b), (c) and 'pass such other order…'), interim relief if urgent, and a verification.",
  writtenStatement:
    "Written statement (Order VIII CPC): PRELIMINARY OBJECTIONS first (limitation, jurisdiction, maintainability, non-joinder, cause of action, valuation and court fee), then REPLY ON MERITS para-wise (specifically deny; an evasive denial is an admission under Order VIII Rule 5), additional facts, a PRAYER to dismiss with costs, and a verification under Order VI Rule 15 CPC distinguishing paras true to knowledge from those on information and legal advice. Never admit the claim.",
  application:
    "Interlocutory application: cause title with I.A. number blank, the order or provision invoked (e.g. Order XXXIX Rules 1–2, s.151 CPC, s.5 Limitation Act), numbered facts, grounds, prayer, and a supporting affidavit note.",
  affidavit:
    "Affidavit: first person by a named deponent with age and address placeholders; numbered paragraphs of facts the deponent can swear from the papers; no argument and no law; verification stating which paras are true to knowledge.",
  note:
    "Short note / written submissions for court: one page; the issues, the order or authority to distinguish, the precise ask. No prayer clause or verification.",
} as const;

export type DraftingKind = keyof typeof DRAFTING_CONVENTIONS;
