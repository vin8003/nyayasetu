// @ts-nocheck
import type { ProceedingId, StageDef, ProceedingDef } from "./types";

export const civil = [
	{
		id: "intake",
		label: "Client intake",
		labelHi: "क्लाइंट इन्टेक",
		what: "Facts, limitation, jurisdiction and maintainability are still being collected. No proceeding has been filed.",
		lawyer: "Take instructions, build a chronology, list missing documents, check limitation and notice requirements (including s.80 CPC where the defendant is government).",
		court: "Nothing yet.",
		docs: [
			"Vakalatnama",
			"ID / board resolution",
			"Title documents",
			"Prior notice"
		],
		deadlines: ["Limitation under the Limitation Act, 1963"],
		next: ["notice", "draft_plaint"],
		branches: [{
			id: "settle",
			to: "closed",
			when: "Client settles or does not instruct"
		}],
		ai: [
			"Chronology",
			"Missing-fact list",
			"Limitation flag"
		],
		human: [
			"Whether to send notice",
			"Forum choice",
			"Cause of action"
		]
	},
	{
		id: "notice",
		label: "Pre-litigation notice",
		labelHi: "वादपूर्व सूचना",
		what: "A legal notice has been or must be sent. Reply period is running.",
		lawyer: "Draft and serve notice, diary the reply window, collect proof of service.",
		court: "Nothing yet.",
		docs: [
			"Legal notice",
			"Postal / email proof",
			"Reply if received"
		],
		deadlines: ["Statutory notice period", "Client-set reply window"],
		next: ["draft_plaint"],
		branches: [{
			id: "complied",
			to: "closed",
			when: "Opposite party complies"
		}],
		ai: ["Notice draft from facts", "Reply analysis"],
		human: ["Demand amount / relief", "Without-prejudice language"]
	},
	{
		id: "draft_plaint",
		label: "Drafting plaint",
		labelHi: "वादपत्र ड्राफ्ट",
		what: "Pleadings are being prepared. Cause of action, valuation, court fee and parties must be right before filing.",
		lawyer: "Settle plaint, list of dates, documents, valuation and court fee; obtain verification and affidavit.",
		court: "Nothing yet.",
		docs: [
			"Plaint",
			"List of dates",
			"Documents with index",
			"Court-fee calculation"
		],
		deadlines: ["Limitation"],
		next: ["filing"],
		branches: [],
		ai: [
			"Issue list",
			"Draft skeleton",
			"Citation check"
		],
		human: ["Final factual assertions", "Prayer"]
	},
	{
		id: "filing",
		label: "Filing",
		labelHi: "दाखिल",
		what: "Papers are at the filing counter or e-filing portal. Numbering has not issued.",
		lawyer: "File, pay court fee, watch for scrutiny objections, keep the filing receipt.",
		court: "Registry receives the filing.",
		docs: ["Filing receipt", "e-filing acknowledgement"],
		deadlines: ["Cure defects within registry time"],
		next: ["scrutiny"],
		branches: [],
		ai: ["Defect checklist"],
		human: ["Whether to refile or cure"]
	},
	{
		id: "scrutiny",
		label: "Scrutiny / defects",
		labelHi: "संवीक्षा / दोष",
		what: "Registry has raised defects. The matter is not registered until they are cured.",
		lawyer: "Cure defects, refile pages, get endorsement.",
		court: "Scrutiny officer marks defects or clears for numbering.",
		docs: ["Defect list", "Cured pages"],
		deadlines: ["Registry cure window"],
		next: ["registered"],
		branches: [{
			id: "returned",
			to: "filing",
			when: "Filing returned"
		}],
		ai: ["Map defects to pages"],
		human: ["Legal characterisation of a defect"]
	},
	{
		id: "registered",
		label: "Registered",
		labelHi: "पंजीकृत",
		what: "Case number / CNR exists. Summons have not gone.",
		lawyer: "Note CNR and case number, apply for summons, watch listing.",
		court: "Numbers the suit and places it for summons / first listing.",
		docs: ["Registration endorsement", "CNR"],
		deadlines: [],
		next: ["summons"],
		branches: [],
		ai: ["Matter summary"],
		human: ["Urgency / early listing"]
	},
	{
		id: "summons",
		label: "Summons issued",
		labelHi: "समन्स जारी",
		what: "Court has ordered summons. Service is the live problem.",
		lawyer: "Take dasti if allowed, instruct process server, track service, consider substituted service (Order V r.20).",
		court: "Issues summons / notices.",
		docs: ["Summons", "Process server report"],
		deadlines: ["Next listing for service"],
		next: ["service"],
		branches: [],
		ai: ["Service checklist"],
		human: ["Substituted service application"]
	},
	{
		id: "service",
		label: "Service / appearance",
		labelHi: "तामील / उपस्थिति",
		what: "Waiting for service or first appearance. Written statement clock has not necessarily started.",
		lawyer: "Prove service or press for fresh summons; note who appeared.",
		court: "Records service / non-service; may proceed ex parte later.",
		docs: [
			"Service affidavit",
			"Appearance memo",
			"Vakalatnama of opposite side"
		],
		deadlines: ["Re-issue of summons"],
		next: ["ws_pending"],
		branches: [{
			id: "exparte",
			to: "ex_parte",
			when: "Defendant fails to appear after service"
		}, {
			id: "fresh",
			to: "summons",
			when: "Service fails"
		}],
		ai: ["Flag non-service risk"],
		human: ["Ex parte request"]
	},
	{
		id: "ws_pending",
		label: "Written statement pending",
		labelHi: "लिखित बयान बाकी",
		what: "Defendant is on the clock to file the written statement. Ordinary suits: 30 days from service, extendable to 90 (Order VIII r.1). Commercial: 120-day outer limit is mandatory.",
		lawyer: "If defending — draft WS, set-off/counterclaim, documents. If suing — diary the drop-dead date and resist late WS.",
		court: "May grant time within the statutory outer limit.",
		docs: [
			"Written statement",
			"Affidavit of admission/denial",
			"Documents"
		],
		deadlines: ["O.8 r.1 30/90 days", "Commercial Courts 120-day hard stop"],
		next: ["replication", "issues"],
		branches: [{
			id: "struck",
			to: "issues",
			when: "Right to WS closed; proceed on plaintiff's case"
		}],
		ai: [
			"WS skeleton",
			"Admission/denial table",
			"Deadline calculation (must be confirmed)"
		],
		human: ["Admissions", "Counterclaim"]
	},
	{
		id: "replication",
		label: "Replication / rejoinder",
		labelHi: "प्रत्युत्तर",
		what: "Plaintiff replies to new facts in the WS where the court permits.",
		lawyer: "Draft replication confined to new facts; avoid a second plaint.",
		court: "May take it on record.",
		docs: ["Replication"],
		deadlines: ["Time granted by court"],
		next: ["issues"],
		branches: [],
		ai: ["New-fact extraction"],
		human: ["What is truly new"]
	},
	{
		id: "interim",
		label: "Interim applications",
		labelHi: "अंतरिम आवेदन",
		what: "IAs (injunction Order 39, attachment Order 38, appointment of receiver, impleadment) are live alongside the suit.",
		lawyer: "Prepare IA, reply, evidence affidavits; argue urgency.",
		court: "Issues notice / ad-interim / disposes IA.",
		docs: [
			"IA",
			"Reply",
			"Affidavits",
			"Order on IA"
		],
		deadlines: ["Ad-interim continuation", "Reply time"],
		next: ["issues"],
		branches: [{
			id: "stay",
			to: "ws_pending",
			when: "Suit continues under interim regime"
		}],
		ai: ["Balance of convenience note", "Precedent list"],
		human: ["Whether to seek ad-interim", "Undertakings"]
	},
	{
		id: "issues",
		label: "Issues framed",
		labelHi: "मुद्दे निर्धारित",
		what: "Court has framed issues (Order XIV). Evidence will track them.",
		lawyer: "Propose issues, object to loaded framing, plan evidence per issue.",
		court: "Frames / recasts issues.",
		docs: ["Issues", "Order framing issues"],
		deadlines: ["Plaintiff evidence date"],
		next: ["plaintiff_evidence"],
		branches: [],
		ai: ["Issue map to documents and authorities"],
		human: ["Final issue list"]
	},
	{
		id: "plaintiff_evidence",
		label: "Plaintiff evidence",
		labelHi: "वादी साक्ष्य",
		what: "Examination-in-chief (usually affidavit, Order XVIII r.4) and cross of plaintiff's witnesses.",
		lawyer: "File evidence affidavits, exhibit documents, prepare cross if defending, produce witnesses.",
		court: "Records evidence, marks exhibits, may close PE.",
		docs: [
			"Evidence affidavit",
			"Exhibit list",
			"Commission if any"
		],
		deadlines: ["Witness dates"],
		next: ["defendant_evidence"],
		branches: [{
			id: "no_dw",
			to: "arguments",
			when: "Defendant leads no evidence"
		}],
		ai: ["Cross notes", "Exhibit checklist"],
		human: ["Whom to call", "What to put to a witness"]
	},
	{
		id: "defendant_evidence",
		label: "Defendant evidence",
		labelHi: "प्रतिवादी साक्ष्य",
		what: "Defence witnesses on affidavit and in cross.",
		lawyer: "Same as PE from the other side of the table.",
		court: "Records DE and may close evidence.",
		docs: ["Defence affidavits", "Exhibits"],
		deadlines: ["Witness dates"],
		next: ["arguments"],
		branches: [],
		ai: ["Cross notes"],
		human: ["Whether to lead DE"]
	},
	{
		id: "arguments",
		label: "Final arguments",
		labelHi: "अंतिम बहस",
		what: "Evidence is closed. Written submissions and oral hearing remain.",
		lawyer: "File written submissions, authority compilation, distinguish adverse cases.",
		court: "Hears arguments, reserves or pronounces.",
		docs: ["Written submissions", "Compilation of judgments"],
		deadlines: ["Filing of written submissions if directed"],
		next: ["judgment"],
		branches: [],
		ai: ["Argument outline", "Citation gate"],
		human: ["What to press and what to drop"]
	},
	{
		id: "judgment",
		label: "Judgment / decree",
		labelHi: "निर्णय / डिक्री",
		what: "Court has decided. Decree drawing, certified copies and limitation for appeal are live.",
		lawyer: "Read the judgment, extract findings, apply for certified copies, advise on appeal / review / execution.",
		court: "Pronounces judgment and draws decree (Order XX).",
		docs: [
			"Judgment",
			"Decree",
			"Certified copy application"
		],
		deadlines: [
			"Appeal limitation",
			"Review 30 days",
			"Certified copy time excluded under Limitation Act s.12"
		],
		next: ["closed"],
		branches: [{
			id: "appeal",
			to: "closed",
			when: "Hand off to appellate matter"
		}, {
			id: "review",
			to: "arguments",
			when: "Review admitted"
		}],
		ai: ["Finding extraction", "Appealability / limitation flag"],
		human: ["Whether to appeal"]
	},
	{
		id: "ex_parte",
		label: "Ex parte",
		labelHi: "एकपक्षीय",
		what: "Defendant did not appear. Plaintiff may lead ex parte evidence. Setting aside (Order IX r.13) remains a branch.",
		lawyer: "Lead ex parte evidence or, if defending, move to set aside with sufficient cause.",
		court: "May decree ex parte; may set aside on terms.",
		docs: ["Ex parte evidence", "O.9 r.13 application"],
		deadlines: ["O.9 r.13 limitation"],
		next: ["judgment"],
		branches: [{
			id: "set_aside",
			to: "ws_pending",
			when: "Ex parte decree set aside"
		}],
		ai: ["Sufficient-cause research"],
		human: ["Whether to proceed ex parte"]
	},
	{
		id: "closed",
		label: "Closed",
		labelHi: "बंद",
		what: "No live step in this matter. Appeal or execution should be a new or linked matter.",
		lawyer: "Archive file, return documents, close fee.",
		court: "Record consigned.",
		docs: ["Closure note"],
		deadlines: [],
		next: [],
		branches: [],
		ai: ["Archive summary"],
		human: ["Final client advice"]
	}
];
export const commercial = civil.map((s) => s.id === "ws_pending" ? {
	...s,
	what: "Commercial Courts Act: written statement must be filed within 30 days of service, extendable only up to 120 days. After 120 days the right is forfeited — the 120-day outer limit is mandatory (SC: SCG Contracts).",
	deadlines: ["30 days from service", "Hard outer limit 120 days — not directory"]
} : s);
export const criminal = [
	{
		id: "incident",
		label: "Incident / complaint",
		labelHi: "घटना / परिवाद",
		what: "An alleged offence exists. FIR may or may not have been registered. BNSS is the procedure for offences from 1 July 2024; older pending cases still run on CrPC.",
		lawyer: "Preserve evidence, consider 173 BNSS FIR / zero FIR / complaint 223 BNSS, and 482 BNSS anticipatory bail if arrest is likely.",
		court: "May record a complaint or direct police action.",
		docs: [
			"Complaint",
			"Medical / CCTV",
			"List of witnesses"
		],
		deadlines: ["Anticipatory bail before arrest"],
		next: ["fir", "investigation"],
		branches: [{
			id: "ab",
			to: "bail",
			when: "Anticipatory bail filed first"
		}],
		ai: ["Offence mapping (BNS / IPC)", "Missing-fact list"],
		human: ["FIR vs private complaint", "Whether to seek AB"]
	},
	{
		id: "fir",
		label: "FIR registered",
		labelHi: "FIR दर्ज",
		what: "Section 173 BNSS (154 CrPC). Investigation has a clock for default bail.",
		lawyer: "Obtain FIR, advise on 35 BNSS / 41A-style notice vs arrest, start bail strategy.",
		court: "Does not try yet; magistrate may be involved in remand.",
		docs: ["FIR", "Notice under BNSS 35"],
		deadlines: ["Default bail 187 BNSS — 60/90 days"],
		next: ["investigation"],
		branches: [],
		ai: ["FIR offence note"],
		human: ["Surrender vs wait"]
	},
	{
		id: "investigation",
		label: "Investigation",
		labelHi: "विवेचना",
		what: "Police investigation (174–187 BNSS). Forensic is mandatory for offences punishable with 7+ years.",
		lawyer: "Track 161/180 statements, seizure, remand, default-bail clock; consider quash at High Court if the FIR discloses no offence.",
		court: "Remand court (187 BNSS) is the live court, not the trial court yet.",
		docs: [
			"Remand applications",
			"Seizure memos",
			"Case diary excerpts if obtained"
		],
		deadlines: ["60/90 day charge-sheet for default bail"],
		next: ["chargesheet", "bail"],
		branches: [{
			id: "closure",
			to: "closed",
			when: "Closure / cancellation report"
		}],
		ai: ["Default-bail calculator (confirm dates)", "Quash maintainability"],
		human: ["Bail vs wait for report"]
	},
	{
		id: "bail",
		label: "Bail / custody",
		labelHi: "जमानत / अभिरक्षा",
		what: "Regular bail 480/483 BNSS, anticipatory 482, default 187(3), cancellation 494. Conditions and sureties are live obligations.",
		lawyer: "Draft bail, compile antecedents, argue 482/480 factors; after grant, ensure bonds and conditions.",
		court: "Grants, rejects, or imposes conditions.",
		docs: [
			"Bail application",
			"Order",
			"Bail bonds"
		],
		deadlines: ["Bond execution", "Condition compliance"],
		next: [
			"investigation",
			"chargesheet",
			"cognizance"
		],
		branches: [{
			id: "cancel",
			to: "bail",
			when: "Cancellation sought"
		}],
		ai: ["Bail note from FIR and antecedents"],
		human: ["Which court (Magistrate / Sessions / HC)", "Conditions to offer"]
	},
	{
		id: "chargesheet",
		label: "Charge-sheet / police report",
		labelHi: "आरोप-पत्र",
		what: "Section 193 BNSS police report. May be charge-sheet or closure.",
		lawyer: "Obtain report and documents, advise on discharge vs trial, check if all accused are named.",
		court: "Receives report for cognizance.",
		docs: [
			"Charge-sheet",
			"List of documents and witnesses",
			"S.207/230 BNSS supply"
		],
		deadlines: ["Supply of copies"],
		next: ["cognizance"],
		branches: [{
			id: "closure",
			to: "closed",
			when: "Closure accepted"
		}],
		ai: ["Gap analysis vs FIR"],
		human: ["Protest petition if closure"]
	},
	{
		id: "cognizance",
		label: "Cognizance & process",
		labelHi: "संज्ञान व प्रक्रिया",
		what: "Magistrate takes cognizance (210 BNSS) and issues summons/warrant (227 BNSS).",
		lawyer: "Appear, take copies, consider discharge.",
		court: "Takes cognizance, issues process.",
		docs: ["Cognizance order", "Summons / warrant"],
		deadlines: ["Appearance"],
		next: ["charge"],
		branches: [],
		ai: ["Process note"],
		human: ["Exemption from appearance"]
	},
	{
		id: "charge",
		label: "Charge / discharge",
		labelHi: "आरोप / डिस्चार्ज",
		what: "Sessions charge 251 BNSS (within 60 days of first hearing on charge). Warrant-case 263. Discharge 250/262/268 BNSS.",
		lawyer: "Argue discharge or the form of charge; plea is taken.",
		court: "Discharges or frames charge; records plea.",
		docs: [
			"Charge",
			"Discharge order",
			"Plea"
		],
		deadlines: ["60 days to frame sessions charge from first hearing on charge"],
		next: ["prosecution_evidence"],
		branches: [{
			id: "discharge",
			to: "closed",
			when: "Discharged"
		}],
		ai: ["Discharge note", "Charge defects"],
		human: ["Plea", "Whether to press discharge"]
	},
	{
		id: "prosecution_evidence",
		label: "Prosecution evidence",
		labelHi: "अभियोजन साक्ष्य",
		what: "PW examination and cross. Documents and FSL reports come in here.",
		lawyer: "Cross-examine; object to inadmissible material; watch for 311/348 BNSS recall.",
		court: "Records PE, may close it.",
		docs: [
			"Depositions",
			"Exhibits",
			"FSL"
		],
		deadlines: ["Witness dates"],
		next: ["accused_statement"],
		branches: [],
		ai: ["Cross plan from charge-sheet"],
		human: ["Line of cross"]
	},
	{
		id: "accused_statement",
		label: "Accused statement",
		labelHi: "अभियुक्त का बयान",
		what: "Section 351 BNSS (313 CrPC). Incriminating circumstances must be put. This is not evidence for the prosecution.",
		lawyer: "Prepare the accused for each circumstance; written statement may accompany.",
		court: "Puts circumstances, records answers.",
		docs: ["351 BNSS statement"],
		deadlines: ["Date fixed"],
		next: ["defence"],
		branches: [{
			id: "no_dw",
			to: "arguments",
			when: "No defence evidence"
		}],
		ai: ["Circumstance list from PE"],
		human: ["Answers", "Whether to lead DW"]
	},
	{
		id: "defence",
		label: "Defence evidence",
		labelHi: "बचाव साक्ष्य",
		what: "Optional DW and defence documents.",
		lawyer: "Decide whether DW helps; risk of filling holes in PE.",
		court: "Records DE.",
		docs: ["Defence witnesses", "Documents"],
		deadlines: ["DW dates"],
		next: ["arguments"],
		branches: [],
		ai: ["DW necessity note"],
		human: ["Whether to enter the box"]
	},
	{
		id: "arguments",
		label: "Arguments",
		labelHi: "बहस",
		what: "Final hearing on conviction. BNSS asks for judgment within 30 days of arguments (extendable to 60).",
		lawyer: "Written submissions, authorities, benefit of doubt.",
		court: "Hears, reserves, or pronounces.",
		docs: ["Written submissions"],
		deadlines: ["Judgment 30/60 days from arguments"],
		next: ["judgment"],
		branches: [],
		ai: ["Argument outline"],
		human: ["What to concede"]
	},
	{
		id: "judgment",
		label: "Judgment / sentence",
		labelHi: "निर्णय / दंड",
		what: "Acquittal or conviction (392 BNSS). Sentence is a separate hearing if convicted.",
		lawyer: "Mitigation if convicted; advise appeal / revision; apply for copies and suspension of sentence.",
		court: "Judges, then sentences if required.",
		docs: ["Judgment", "Sentence order"],
		deadlines: ["Appeal limitation", "Suspension of sentence"],
		next: ["closed"],
		branches: [{
			id: "appeal",
			to: "closed",
			when: "Appeal filed as a new matter"
		}],
		ai: ["Grounds of appeal from findings"],
		human: ["Appeal decision"]
	},
	{
		id: "closed",
		label: "Closed",
		labelHi: "बंद",
		what: "No live criminal step in this file.",
		lawyer: "Archive; track any connected bail conditions that survive.",
		court: "Record consigned.",
		docs: ["Closure note"],
		deadlines: [],
		next: [],
		branches: [],
		ai: ["Archive summary"],
		human: ["Final advice"]
	}
];
export const writ = [
	{
		id: "intake",
		label: "Writ intake",
		labelHi: "रिट इन्टेक",
		what: "Article 226/32 candidate. Maintainability is the first legal question — alternative remedy, disputed facts, laches, locus.",
		lawyer: "Test maintainability, collect the impugned order, limitation/laches, and whether a statutory appeal exists.",
		court: "Nothing yet.",
		docs: ["Impugned order", "Representation trail"],
		deadlines: ["Laches"],
		next: ["drafting"],
		branches: [{
			id: "alt",
			to: "closed",
			when: "Alternative remedy is the right path"
		}],
		ai: ["Maintainability note"],
		human: ["Writ vs civil suit vs appeal"]
	},
	{
		id: "drafting",
		label: "Petition drafting",
		labelHi: "याचिका ड्राफ्ट",
		what: "Writ petition, affidavit, stay application, and documents are being settled.",
		lawyer: "Draft WP, grounds, prayer including interim, caveat check.",
		court: "Nothing yet.",
		docs: [
			"Writ petition",
			"Stay application",
			"Documents"
		],
		deadlines: ["Caveat 90 days if filed by the other side"],
		next: ["filing"],
		branches: [],
		ai: ["Grounds from the order", "Precedent list"],
		human: ["Prayer and interim"]
	},
	{
		id: "filing",
		label: "Filing / numbering",
		labelHi: "दाखिल / नंबर",
		what: "At High Court filing; defects and numbering.",
		lawyer: "Cure defects, watch the board for admission.",
		court: "Registry scrutiny and numbering.",
		docs: ["Filing receipt", "Defect list"],
		deadlines: ["Cure defects"],
		next: ["admission"],
		branches: [],
		ai: ["Defect map"],
		human: ["Mention for urgent listing"]
	},
	{
		id: "admission",
		label: "Admission / notice",
		labelHi: "स्वीकृति / नोटिस",
		what: "Preliminary hearing. Court may issue notice, grant rule, dismiss in limine, or grant interim.",
		lawyer: "Argue maintainability and urgency; be ready with the record.",
		court: "Admits, issues notice, or dismisses.",
		docs: ["Order of admission / notice", "Interim order"],
		deadlines: ["Service of notice"],
		next: ["counter"],
		branches: [{
			id: "dismissed",
			to: "closed",
			when: "Dismissed in limine"
		}],
		ai: ["Admission note"],
		human: ["What interim to press"]
	},
	{
		id: "counter",
		label: "Counter / rejoinder",
		labelHi: "जवाब / रिजॉइंडर",
		what: "State / respondent counter-affidavit is due; rejoinder follows.",
		lawyer: "Chase counter, draft rejoinder confined to new facts.",
		court: "Grants time, may vacate interim for default.",
		docs: ["Counter-affidavit", "Rejoinder"],
		deadlines: ["Time granted for counter"],
		next: ["final_hearing"],
		branches: [],
		ai: ["New-fact extraction"],
		human: ["What to admit"]
	},
	{
		id: "final_hearing",
		label: "Final hearing",
		labelHi: "अंतिम सुनवाई",
		what: "On merits after pleadings.",
		lawyer: "Compilation, chronology, propositions of law.",
		court: "Hears and reserves or pronounces.",
		docs: ["Written submissions", "Compilation"],
		deadlines: [],
		next: ["judgment"],
		branches: [],
		ai: ["Proposition / authority map"],
		human: ["What to press"]
	},
	{
		id: "judgment",
		label: "Judgment",
		labelHi: "निर्णय",
		what: "Writ allowed, dismissed, or disposed with directions. LPA / SLP may follow.",
		lawyer: "Extract directions, compliance dates, further remedy.",
		court: "Pronounces.",
		docs: ["Judgment / order"],
		deadlines: ["LPA / SLP limitation", "Compliance dates in the order"],
		next: ["closed"],
		branches: [{
			id: "lpa",
			to: "closed",
			when: "Further remedy as a new matter"
		}],
		ai: ["Direction extraction"],
		human: ["Whether to appeal"]
	},
	{
		id: "closed",
		label: "Closed",
		labelHi: "बंद",
		what: "No live writ step.",
		lawyer: "Archive and track any continuing mandamus.",
		court: "Record consigned.",
		docs: [],
		deadlines: [],
		next: [],
		branches: [],
		ai: [],
		human: []
	}
];
export const appellate = [
	{
		id: "decision",
		label: "Trial decision",
		labelHi: "मूल निर्णय",
		what: "A judgment / decree / award exists. Appealability and limitation are the first questions.",
		lawyer: "Read findings, identify appealable decree vs unappealable order, diary limitation, apply for certified copies.",
		court: "Nothing in the appellate court yet.",
		docs: [
			"Judgment",
			"Decree",
			"Certified copy application"
		],
		deadlines: ["First appeal typically 90 days; others vary — confirm the statute"],
		next: ["drafting"],
		branches: [{
			id: "no_appeal",
			to: "closed",
			when: "No appeal advised"
		}],
		ai: ["Finding extraction", "Appealability note"],
		human: ["Whether to appeal"]
	},
	{
		id: "drafting",
		label: "Appeal drafting",
		labelHi: "अपील ड्राफ्ट",
		what: "Memorandum of appeal, stay, and grounds.",
		lawyer: "Draft grounds attacking findings, not re-pleading the suit; prepare stay.",
		court: "Nothing yet.",
		docs: [
			"Memorandum of appeal",
			"Stay application",
			"Impugned judgment"
		],
		deadlines: ["Limitation minus copy time"],
		next: ["filing"],
		branches: [],
		ai: ["Grounds from adverse findings"],
		human: ["Which findings to attack"]
	},
	{
		id: "filing",
		label: "Filing / defects",
		labelHi: "दाखिल / दोष",
		what: "Appellate filing and scrutiny.",
		lawyer: "Cure defects, pay deficit court fee if any.",
		court: "Registry.",
		docs: ["Filing receipt", "Defects"],
		deadlines: ["Cure window — limitation already spent on filing"],
		next: ["admission"],
		branches: [],
		ai: ["Defect map"],
		human: ["Court fee"]
	},
	{
		id: "admission",
		label: "Admission / notice / stay",
		labelHi: "स्वीकृति / नोटिस / स्थगन",
		what: "Admission hearing. Stay of execution is often the real urgency.",
		lawyer: "Argue substantial questions / stay factors.",
		court: "Admits, issues notice, may stay.",
		docs: ["Admission order", "Stay order"],
		deadlines: ["Service", "Stay conditions (deposit etc.)"],
		next: ["hearing"],
		branches: [{
			id: "dismissed",
			to: "closed",
			when: "Dismissed at admission"
		}],
		ai: ["Stay note"],
		human: ["Deposit / conditions"]
	},
	{
		id: "hearing",
		label: "Hearing",
		labelHi: "सुनवाई",
		what: "Regular hearing after paper book.",
		lawyer: "Paper book, written submissions, cross-objections if any.",
		court: "Hears.",
		docs: ["Paper book", "Written submissions"],
		deadlines: ["Cross-objection time"],
		next: ["judgment"],
		branches: [],
		ai: ["Issue / finding map"],
		human: ["Concessions"]
	},
	{
		id: "judgment",
		label: "Appellate judgment",
		labelHi: "अपीलीय निर्णय",
		what: "Allowed, dismissed, remanded, or modified. Further appeal / SLP may lie.",
		lawyer: "Extract operative portion; advise next remedy.",
		court: "Pronounces.",
		docs: ["Judgment"],
		deadlines: ["Further appeal / SLP"],
		next: ["closed"],
		branches: [],
		ai: ["Operative extraction"],
		human: ["Further appeal"]
	},
	{
		id: "closed",
		label: "Closed",
		labelHi: "बंद",
		what: "No live appellate step.",
		lawyer: "Archive.",
		court: "Record consigned.",
		docs: [],
		deadlines: [],
		next: [],
		branches: [],
		ai: [],
		human: []
	}
];
export const family = [
	{
		...civil[0],
		id: "intake",
		next: ["notice"]
	},
	{
		id: "notice",
		label: "Notice / mediation",
		labelHi: "नोटिस / मध्यस्थता",
		what: "Family Courts Act encourages settlement. Many courts send the matter to mediation before trial.",
		lawyer: "Advise on settlement vs contest; attend mediation with instructions.",
		court: "May refer to mediation.",
		docs: ["Petition", "Mediation report"],
		deadlines: ["Mediation window"],
		next: ["ws_pending"],
		branches: [{
			id: "settled",
			to: "closed",
			when: "Settlement recorded"
		}],
		ai: ["Issues for mediation"],
		human: ["Settlement authority"]
	},
	{
		...civil.find((s) => s.id === "ws_pending"),
		next: ["issues"]
	},
	civil.find((s) => s.id === "issues"),
	{
		...civil.find((s) => s.id === "plaintiff_evidence"),
		next: ["arguments"],
		branches: []
	},
	civil.find((s) => s.id === "arguments"),
	civil.find((s) => s.id === "judgment"),
	civil.find((s) => s.id === "closed")
];
export const consumer = [
	{
		id: "intake",
		label: "Consumer intake",
		labelHi: "उपभोक्ता इन्टेक",
		what: "Defect / deficiency / unfair trade. Pecuniary and territorial jurisdiction of the Commission matter.",
		lawyer: "Check limitation (2 years, s.69 CPA 2019), notice, pecuniary limit.",
		court: "Nothing yet.",
		docs: [
			"Invoice",
			"Warranty",
			"Prior complaint"
		],
		deadlines: ["2 years from cause of action"],
		next: ["filing"],
		branches: [],
		ai: ["Jurisdiction / limitation note"],
		human: ["Forum (District / State / National)"]
	},
	{
		id: "filing",
		label: "Complaint filed",
		labelHi: "शिकायत दाखिल",
		what: "Consumer complaint numbered. Notice to opposite party.",
		lawyer: "File, serve, diary OP's reply.",
		court: "Issues notice.",
		docs: ["Complaint", "Notice"],
		deadlines: ["OP reply — 30 days + 15 (s.38 CPA)"],
		next: ["ws_pending"],
		branches: [],
		ai: ["Relief calculation"],
		human: ["Compensation figure"]
	},
	{
		id: "ws_pending",
		label: "Opposite-party reply",
		labelHi: "विपक्षी जवाब",
		what: "Reply / version of OP. 30+15 days under CPA 2019.",
		lawyer: "Chase reply or press ex parte; file rejoinder.",
		court: "May proceed ex parte if OP defaults.",
		docs: ["Reply", "Rejoinder"],
		deadlines: ["30 + 15 days"],
		next: ["arguments"],
		branches: [],
		ai: ["Admission table"],
		human: ["Whether to evidence"]
	},
	civil.find((s) => s.id === "arguments"),
	civil.find((s) => s.id === "judgment"),
	civil.find((s) => s.id === "closed")
];
export const PROCEEDING_DEFS = [
	{
		id: "civil",
		label: "Civil suit",
		labelHi: "दीवानी वाद",
		statute: "Code of Civil Procedure, 1908",
		note: "Branching, not a checklist. Interim applications can open at almost any stage after registration.",
		stages: civil
	},
	{
		id: "commercial",
		label: "Commercial suit",
		labelHi: "वाणिज्यिक वाद",
		statute: "Commercial Courts Act, 2015 + CPC as amended",
		note: "Written statement 120-day outer limit is mandatory. Case management hearings are first-class events.",
		stages: commercial
	},
	{
		id: "criminal",
		label: "Criminal",
		labelHi: "आपराधिक",
		statute: "BNSS 2023 (CrPC 1973 for older pending cases) · BNS · BSA",
		note: "Lawyer workflow (bail, appearance, cross) intersects police and remand court workflows before the trial court is seized.",
		stages: criminal
	},
	{
		id: "writ",
		label: "Writ / constitutional",
		labelHi: "रिट",
		statute: "Constitution Arts. 226 / 32 · High Court rules",
		note: "Do not run this as a civil suit. Maintainability is a separate stage.",
		stages: writ
	},
	{
		id: "appellate",
		label: "Appeal / revision",
		labelHi: "अपील / पुनरीक्षण",
		statute: "CPC ss.96–115 · CrPC/BNSS appeal chapters · Letters Patent / SLP",
		note: "Limitation and certified copies dominate the first week.",
		stages: appellate
	},
	{
		id: "family",
		label: "Family",
		labelHi: "पारिवारिक",
		statute: "Family Courts Act · HMA / HAMA / Guardianship / DV Act as applicable",
		note: "Mediation is a real stage, not decoration.",
		stages: family
	},
	{
		id: "consumer",
		label: "Consumer",
		labelHi: "उपभोक्ता",
		statute: "Consumer Protection Act, 2019",
		note: "Pecuniary jurisdiction and 30+15 reply clock.",
		stages: consumer
	},
	{
		id: "arbitration",
		label: "Arbitration",
		labelHi: "मध्यस्थता",
		statute: "Arbitration and Conciliation Act, 1996",
		note: "s.9, s.11, s.29A, s.34 are the court intersections. The tribunal is not a court.",
		stages: [
			{
				id: "intake",
				label: "Arbitration clause",
				labelHi: "मध्यस्थता खंड",
				what: "Contract has or lacks a clause. Seat, institution, and s.11 appointment are the live questions.",
				lawyer: "Read clause, send invocation, consider s.9 interim in court.",
				court: "s.9 / s.11 if invoked.",
				docs: ["Agreement", "Invocation notice"],
				deadlines: ["Limitation for claims", "s.11"],
				next: ["s9", "tribunal"],
				branches: [{
					id: "court",
					to: "closed",
					when: "No arbitration — file a suit"
				}],
				ai: ["Clause analysis"],
				human: ["Seat / institution"]
			},
			{
				id: "s9",
				label: "Section 9 interim",
				labelHi: "धारा 9 अंतरिम",
				what: "Court interim before or during arbitration.",
				lawyer: "File s.9, then commence arbitration in time so the order survives.",
				court: "Grants or refuses interim.",
				docs: ["s.9 petition", "Order"],
				deadlines: ["Commence arbitration to keep s.9 alive"],
				next: ["tribunal"],
				branches: [],
				ai: ["Urgency note"],
				human: ["Security / conditions"]
			},
			{
				id: "tribunal",
				label: "Tribunal constituted",
				labelHi: "अधिकरण गठित",
				what: "Arbitrator(s) in place. Pleadings under the Act / institutional rules.",
				lawyer: "SOC, SOD, evidence, hearings.",
				court: "Supervisory only.",
				docs: [
					"SOC",
					"SOD",
					"Procedural orders"
				],
				deadlines: ["s.29A time for award"],
				next: ["award"],
				branches: [],
				ai: ["Issue list"],
				human: ["Witnesses"]
			},
			{
				id: "award",
				label: "Award",
				labelHi: "अधिनिर्णय",
				what: "Award published. s.34 challenge window is short and strict.",
				lawyer: "Diary s.34 (3 months + 30 days), execution s.36, stay.",
				court: "s.34 court if challenged.",
				docs: ["Award", "s.34 petition"],
				deadlines: ["s.34: 3 months + 30"],
				next: ["closed"],
				branches: [{
					id: "s34",
					to: "closed",
					when: "Challenge filed as a new matter"
				}],
				ai: ["s.34 ground scan"],
				human: ["Challenge vs comply"]
			},
			{
				id: "closed",
				label: "Closed",
				labelHi: "बंद",
				what: "No live arbitration step.",
				lawyer: "Archive.",
				court: "—",
				docs: [],
				deadlines: [],
				next: [],
				branches: [],
				ai: [],
				human: []
			}
		]
	},
	{
		id: "execution",
		label: "Execution",
		labelHi: "अमल",
		statute: "CPC Order XXI · Art. 136 Limitation Act",
		note: "Treat as its own matter linked to the decree, not a leftover checkbox on the suit.",
		stages: [
			{
				id: "intake",
				label: "Decree in hand",
				labelHi: "डिक्री प्राप्त",
				what: "A decree / award is to be executed. Limitation for execution is generally 12 years (Art. 136).",
				lawyer: "Identify executable operative portion, assets, and the executing court.",
				court: "Nothing yet.",
				docs: ["Decree", "Judgment"],
				deadlines: ["12 years Art. 136"],
				next: ["filed"],
				branches: [],
				ai: ["Operative portion"],
				human: ["Which assets to attach"]
			},
			{
				id: "filed",
				label: "Execution filed",
				labelHi: "अमल दाखिल",
				what: "EP numbered. Modes: attachment, arrest, possession, receiver (Order XXI).",
				lawyer: "File EP, affidavit of assets, process.",
				court: "Issues notice / warrants.",
				docs: ["Execution petition", "Asset affidavit"],
				deadlines: ["Notice"],
				next: ["process"],
				branches: [{
					id: "objection",
					to: "process",
					when: "O.21 r.58 / r.97 objections"
				}],
				ai: ["Mode of execution"],
				human: ["Arrest vs attachment"]
			},
			{
				id: "process",
				label: "Process / objections",
				labelHi: "प्रक्रिया / आपत्ति",
				what: "Warrants, attachment, or objections are live.",
				lawyer: "Press process, reply objections, sale proclamation.",
				court: "Executes or stays.",
				docs: [
					"Warrants",
					"Sale papers",
					"Objection"
				],
				deadlines: ["Sale proclamation"],
				next: ["closed"],
				branches: [],
				ai: ["Objection note"],
				human: ["Settlement of decree"]
			},
			{
				id: "closed",
				label: "Satisfied / closed",
				labelHi: "संतुष्ट / बंद",
				what: "Decree satisfied or EP dismissed.",
				lawyer: "Record satisfaction.",
				court: "Closes EP.",
				docs: ["Satisfaction"],
				deadlines: [],
				next: [],
				branches: [],
				ai: [],
				human: []
			}
		]
	}
];
export function proceedingDef(id: ProceedingId | string) {
	return PROCEEDING_DEFS.find((p) => p.id === id) ?? PROCEEDING_DEFS[0];
}
export function stageDef(proceeding: ProceedingId | string, stageId: string) {
	return proceedingDef(proceeding).stages.find((s) => s.id === stageId);
}
export function defaultStage(proceeding: ProceedingId | string) {
	return proceedingDef(proceeding).stages[0]?.id ?? "intake";
}
export function possibleNext(proceeding: ProceedingId | string, stageId: string) {
	const def = proceedingDef(proceeding);
	const stage = def.stages.find((s) => s.id === stageId);
	if (!stage) return [];
	const label = (id) => def.stages.find((s) => s.id === id)?.label ?? id;
	const next = stage.next.map((id) => ({
		id,
		label: label(id),
		kind: "next" as const
	}));
	const branches = stage.branches.map((b) => ({
		id: b.to,
		label: label(b.to),
		kind: "branch" as const,
		when: b.when
	}));
	return [...next, ...branches];
}
