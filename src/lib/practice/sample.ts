// @ts-nocheck
import { addDaysISO, newId, todayISO } from "./ids.ts";
import { SAMPLE_TITLES } from "./sample-ids.ts";
import type { SamplePack } from "./types.ts";

export {
	SAMPLE_CASE_NUMBERS,
	SAMPLE_TITLES,
	isSampleMatter,
	isSampleTitle,
	looksLikeSample,
} from "./sample-ids.ts";

export function buildSampleChamber(): SamplePack {
	const today = todayISO();
	const tomorrow = addDaysISO(today, 1);
	const week = addDaysISO(today, 7);
	const ago = (n) => addDaysISO(today, -n);
	const c1 = newId("cl");
	const c2 = newId("cl");
	const c3 = newId("cl");
	const m1 = newId("mt");
	const m2 = newId("mt");
	const m3 = newId("mt");
	const dNotice = newId("doc");
	const dOrder1 = newId("doc");
	const dFir = newId("doc");
	const dRemand = newId("doc");
	const dTerm = newId("doc");
	const dWrit = newId("doc");
	const h1file = newId("hr");
	const h1service = newId("hr");
	const h1next = newId("hr");
	const h2arrest = newId("hr");
	const h2jc = newId("hr");
	const h2magbail = newId("hr");
	const h2today = newId("hr");
	const h3number = newId("hr");
	const h3admit = newId("hr");
	const o1 = newId("or");
	const o2 = newId("or");
	const o3 = newId("or");
	const court = "court_direction";
	const ai = "ai_suggestion";
	const statute = "statute";

	const sharmaNotes = `Research question: After service of summons in a Delhi High Court commercial recovery suit for ₹2.47 crore, what authorities govern (a) the 120-day outer limit for the written statement under the Commercial Courts Act / Order VIII Rule 1 CPC, (b) striking off defence if Apex files late, and (c) whether a summary judgment application under Order XIII-A can go ahead if the WS is still pending?

Issues for research:
1. Is the 120-day WS limit mandatory in a Commercial Courts Act suit, and can the court condone delay after 120 days from service?
2. What is the correct application (Order VIII Rule 10 / striking defence / summary judgment Order XIII-A) if the defendant stays silent after a process-server affidavit?
3. Does the plaintiff need a fresh s.12A Commercial Courts Act mediation certificate if the suit already survived the registry's maintainability check?
4. Interest — 18% contractual vs s.34 CPC discretion; GST already invoiced.

Chronology:
- 4 Jan 2026: Purchase Order PO/APX/2026/014 for supply of industrial fasteners and MS fittings to Apex's Bawana works. Contract clause 14: disputes to Delhi courts; clause 17: 18% p.a. delayed payment.
- April–June 2026: Eight tax invoices INV-441 to INV-448, aggregate ₹2,47,80,000 (taxable value ₹2,10,00,000 + GST). Goods received; GRNs on record. Apex paid ₹6,00,000 on 11 May 2026 and then stopped.
- 2 Jul 2026: E-mail from Apex's purchase head admitting quantity and asking 90 days. No dispute on quality.
- 18 Jul 2026: Legal notice through counsel (15 days). Tracking: delivered 19 Jul 2026. No reply.
- 22 Jul 2026: Form-1 s.12A application before the District Legal Services Authority (North-West). Apex did not appear. Non-starter report dated 8 Aug 2026.
- 10 Aug 2026: CS (COMM) 412/2026 filed as a commercial summary suit-style recovery with a prayer for money decree, pendente lite and future interest at 18%, and costs. Specified value ₹2.47 crore — Commercial Division, Delhi High Court.
- 18 Aug 2026: Summons served on Apex's registered office at Wazirpur through process server Shri Naresh Yadav. Acknowledgement of the receptionist plus photographs. Process report on the DHC file. WS clock starts 18 Aug 2026. 120th day falls on 16 Dec 2026.
- Last order (18 Aug 2026): "Service held sufficient. Defendant may file written statement within the time permitted by the Commercial Courts Act. List on the next date for WS / further orders. Plaintiff to keep the process-server affidavit ready if service is disputed."
- Defendant has not entered appearance, not filed vakalatnama, not sought time.
- Next listing: tomorrow, 14:15, Court 32, Single Judge (Commercial). Purpose: written statement / further orders.

Evidence on the brief: PO, invoices, e-way bills, GRNs, bank statements showing the ₹6 lakh credit, legal notice + postal receipt, s.12A non-starter report, process-server affidavit (draft), MCA master data of Apex (CIN U51909DL2018PTC348221), board resolution and vakalatnama of the plaintiff (proprietor Vikram Sharma, GSTIN 07AAOPS…).

Relief for tomorrow: (i) record that no WS has been filed; (ii) fix a short date inside the 120-day window; (iii) liberty to move Order XIII-A summary judgment after the outer limit or if the defendant appears only to delay; (iv) do not let the matter slip into a generic "for WS" adjournment without noting the statute clock.`;

	const rakeshNotes = `Research question: For an accused in judicial custody at Jaipur since 21 Aug 2026 in FIR 173/2026 PS Sodala for BNS ss. 318(4) (cheating) and 316(2) (criminal breach of trust), with a recovery of only ₹1.8 lakh against an alleged ₹18 lakh partnership dispute, no prior convictions, and a regular-bail listing today, which Supreme Court and Rajasthan High Court authorities govern grant of regular bail (BNSS 480/483), and when does the default-bail clock under BNSS 187 start for these offences (60 vs 90 days)?

Issues for research:
1. Regular bail: Satender Kumar Antil; Gudikanti Narasimhulu; the "bail is the rule" line after the 2026 BNSS transition — how do Jaipur Sessions Courts apply it to 318/316 BNS?
2. Is this a purely civil partnership dispute given colour of crime (Indian Oil v. NEPC; Prof. R.K. Vijayasarathy)? The FIR is by the other partner after a 14-month delay.
3. Default bail under BNSS 187: these offences are not punishable with death or life. 60-day clock from 21 Aug 2026 unless the magistrate has already authorised 90 days in writing. Confirm from the remand papers.
4. Conditions: local surety, no contact with the complainant, passport, bank freeze already in place for ₹1.8 lakh recovered.

Chronology:
- 2023–2025: Oral partnership "RK Traders" (kirana wholesale, Johri Bazar). No registered deed. Complainant Mohan Lal put in ~₹12 lakh; Rakesh ran the shop. Disputes over accounts from late 2025.
- 11 Jun 2026: Complainant sent a legal notice demanding ₹18 lakh. Rakesh replied on 20 Jun offering inspection of books and proposing ₹4 lakh in four instalments.
- 21 Aug 2026, 06:40: Arrested at his house, PS Sodala, FIR 173/2026 dated 20 Aug 2026, ss. 318(4) and 316(2) BNS (erstwhile IPC 420 / 406). ₹1.8 lakh cash seized from a steel almirah. No other recovery. Mobile and a partnership notebook seized.
- 21 Aug 2026, 16:00: Produced before JM-3, Jaipur Metro. Remanded to 3 days police custody.
- 24 Aug 2026: Further PC refused. Judicial custody to Central Jail, Jaipur. IO has not filed a charge-sheet. Witnesses named are the complainant, his brother, and one transporter.
- 27 Aug 2026: First bail application before the JM was declined as "Sessions offence / alleged amount high".
- Today 10:30, Court 4, Sessions Judge, Jaipur: regular bail (Bail 88/2026). Sureties: father (pensioner) and maternal uncle (shop at Jhotwara) ready. Accused is 29, no passport, no other FIR, wife and a 3-year-old daughter. Employer (after the shop closed) is a cousin's transport firm willing to take him back.

Prosecution line expected today: "siphoning, absconding risk, investigation at the beginning." Defence line: civil colour, delayed FIR, small recovery, roots in Jaipur, Antil guidelines, 187 BNSS clock to be diaried even if bail is deferred.`;

	const mehtaNotes = `Research question: Can a contractual guest-faculty lecturer with six continuous academic sessions in a Rajasthan government college, terminated by a one-page Collector order citing "end of academic session" and Secretary, State of Karnataka v. Uma Devi, maintain a writ under Article 226 at the Jaipur Bench without first going to the Rajasthan Civil Services Appellate Tribunal, and what Supreme Court authorities on legitimate expectation, regularisation vs. termination of contractual appointees, and natural justice (no show-cause) apply?

Issues for research:
1. Maintainability — Article 226 vs. Rajasthan Civil Services Appellate Tribunal / service jurisprudence after L. Chandra Kumar and the State's plea of alternative remedy. Guest faculty is not a "civil servant" under Article 311; does that kill the writ or strengthen it?
2. Uma Devi (2006) 4 SCC 1 is cited in the termination. Distinguish: Uma Devi was about regularisation of illegal appointments, not about terminating a person who was selected through a public advertisement, renewed six times, and is still doing the same work that the college continues to need.
3. Natural justice: no show-cause, no inquiry, no allegation of misconduct — only "session ended". She was teaching the current semester when the order was served. Audi alteram partem in termination of contractual public employment (Gridco; State of Haryana v. Piara Singh; recent SC on outsourcing vs. perennial work).
4. Interim: stay of the termination / direction to continue till a regularly selected candidate joins, given that classes are on and no replacement has been advertised.
5. Back wages and continuity if the writ succeeds.

Chronology:
- 12 Jul 2019: Advertisement by the Commissionerate of College Education, Rajasthan, for guest faculty (Political Science) at Government College, Dausa. Selection on merit list. Appointment order 3 Aug 2019, ₹400/lecture, 20 lectures a week, session-to-session.
- 2019–2025: Six uninterrupted academic sessions. Same papers (Indian Government and Politics; Comparative Politics). ACR-equivalent principal reports: "Good" / "Very Good". She was on the 2024–25 and 2025–26 workload charts. EPF deducted for 11 months in 2023 then stopped; no explanation.
- 14 Mar 2026: She applied, through the principal, for continuation in 2026–27 and for consideration against a vacant substantive post (the last regular lecturer retired in Dec 2025; the post is still vacant).
- 19 Aug 2026: Collector, Dausa, one-page order: "Contractual / guest faculty engagement of Smt. Anita Mehta is terminated with immediate effect as the academic session has ended. No regularisation in view of Uma Devi. Relieving forthwith." Served on her in the staff room at 12:40. No show-cause. The 2026–27 timetable issued on 1 Aug still carries her name.
- 21 Aug 2026: Representation to the Commissioner, College Education — not answered.
- 25 Aug 2026: CWP 2104/2026, Rajasthan High Court, Jaipur Bench. Parties: Anita Mehta vs State of Rajasthan (Higher Education), Commissioner of College Education, Collector Dausa, Principal Government College Dausa. Prayers: quash the 19 Aug order; reinstate with continuity; restrain filling the papers through a fresh guest-faculty list till the writ is decided; in the alternative, consider her against the vacant regular post.
- Listed next week, 10:00, Court 2, Division Bench, for admission / notice. Caveat: none filed by the State.

Facts that help: perennial teaching need; vacant regular post; six renewals; termination mid-semester despite a live timetable; no misconduct. Facts that hurt: the appointment letters say "purely contractual", "no right to regularisation", and "session-wise". Need a clean distinction from Uma Devi and a maintainability paragraph that survives the alternative-remedy objection.`;

	return {
		clients: [
			{
				id: c1,
				name: "Vikram Sharma",
				notes: "Plaintiff, 46, proprietor of Sharma Fasteners, Wazirpur. GST regular. Instructed on commercial recovery of ₹2.47 crore against Apex Traders. Wants a decree, not a long trial. Available for verification of invoices tomorrow after 16:00.",
			},
			{
				id: c2,
				name: "Rakesh Kumar",
				notes: "Accused, 29, resident of Jhotwara, Jaipur. In JC, Central Jail Jaipur since 24 Aug 2026. Family: wife Seema, daughter (3). Father pensioner. Instructed on regular bail today. No other FIR. Passport: none.",
			},
			{
				id: c3,
				name: "Anita Mehta",
				notes: "Petitioner, 38, guest faculty (Political Science), Government College Dausa, 2019–2026. Sole earning member; two school-going children. Terminated 19 Aug 2026. Wants reinstatement before the semester slips.",
			},
		],
		matters: [
			{
				id: m1,
				clientId: c1,
				title: SAMPLE_TITLES[0],
				proceeding: "commercial",
				stage: "ws_pending",
				courtName: "Delhi High Court (Commercial)",
				caseNumber: "CS (COMM) 412/2026",
				cnr: "DLHC01-012345-2026",
				caseType: "CS (COMM)",
				jurisdiction: "Delhi",
				ourSide: "petitioner",
				parties: [
					{ role: "Plaintiff", name: "Vikram Sharma, proprietor of Sharma Fasteners" },
					{ role: "Defendant", name: "Apex Traders Pvt Ltd, through its director Mr Rajeev Anand" },
				],
				status: "active",
				nextHearingOn: tomorrow,
				lastOrderOn: ago(12),
				notes: sharmaNotes,
			},
			{
				id: m2,
				clientId: c2,
				title: SAMPLE_TITLES[1],
				proceeding: "criminal",
				stage: "bail",
				courtName: "Sessions Court, Jaipur",
				caseNumber: "Bail 88/2026",
				cnr: "RJJP01-009900-2026",
				caseType: "Regular bail",
				jurisdiction: "Jaipur",
				ourSide: "accused",
				parties: [
					{ role: "Accused", name: "Rakesh Kumar s/o Shri Banwari Lal" },
					{ role: "Complainant", name: "Mohan Lal s/o Shri Kishan Lal" },
					{ role: "Prosecution", name: "State of Rajasthan (PS Sodala)" },
				],
				status: "active",
				nextHearingOn: today,
				lastOrderOn: ago(3),
				notes: rakeshNotes,
			},
			{
				id: m3,
				clientId: c3,
				title: SAMPLE_TITLES[2],
				proceeding: "writ",
				stage: "admission",
				courtName: "Rajasthan High Court, Jaipur Bench",
				caseNumber: "CWP 2104/2026",
				cnr: "RJHC01-002104-2026",
				caseType: "Civil writ",
				jurisdiction: "Rajasthan",
				ourSide: "petitioner",
				parties: [
					{ role: "Petitioner", name: "Anita Mehta w/o Shri Deepak Mehta" },
					{ role: "Respondent 1", name: "State of Rajasthan, through Principal Secretary, Higher Education" },
					{ role: "Respondent 2", name: "Commissioner, College Education, Rajasthan" },
					{ role: "Respondent 3", name: "Collector, Dausa" },
					{ role: "Respondent 4", name: "Principal, Government College, Dausa" },
				],
				status: "active",
				nextHearingOn: week,
				lastOrderOn: ago(5),
				notes: mehtaNotes,
			},
		],
		hearings: [
			{
				id: h1file,
				matterId: m1,
				listedOn: ago(20),
				listedAt: "10:30",
				courtRoom: "Court 32",
				bench: "Single Judge (Commercial)",
				purpose: "First listing / issuance of summons",
				stage: "summons",
				outcome: "Summons issued to the defendant on the registered office. Process server appointed. List after service.",
				notes: "Plaint and s.12A non-starter report taken on record.",
			},
			{
				id: h1service,
				matterId: m1,
				listedOn: ago(12),
				listedAt: "14:15",
				courtRoom: "Court 32",
				bench: "Single Judge (Commercial)",
				purpose: "Service / further orders",
				stage: "ws_pending",
				outcome: "Service held sufficient on 18 Aug 2026. WS to be filed within the Commercial Courts Act outer limit. List for WS / further orders.",
				notes: "Keep process-server affidavit ready if service is disputed on the next date.",
				nextDate: tomorrow,
			},
			{
				id: h1next,
				matterId: m1,
				listedOn: tomorrow,
				listedAt: "14:15",
				courtRoom: "Court 32",
				bench: "Single Judge (Commercial)",
				purpose: "Written statement / further orders — 120-day clock running from 18 Aug 2026",
				stage: "ws_pending",
			},
			{
				id: h2arrest,
				matterId: m2,
				listedOn: ago(9),
				listedAt: "16:20",
				courtRoom: "JM-3",
				bench: "Judicial Magistrate No. 3, Jaipur Metro",
				purpose: "First production after arrest",
				stage: "remand",
				outcome: "Police custody for 3 days. Next production 24 Aug 2026. Medical of the accused recorded as NAD.",
				notes: "FIR, seizure memo of ₹1.8 lakh and arrest memo supplied.",
			},
			{
				id: h2jc,
				matterId: m2,
				listedOn: ago(6),
				listedAt: "11:00",
				courtRoom: "JM-3",
				bench: "Judicial Magistrate No. 3, Jaipur Metro",
				purpose: "Further remand",
				stage: "remand",
				outcome: "PC closed. Judicial custody to Central Jail, Jaipur. Default-bail clock under BNSS 187 to be watched.",
				notes: "IO did not seek further PC. No charge-sheet yet.",
			},
			{
				id: h2magbail,
				matterId: m2,
				listedOn: ago(3),
				listedAt: "12:00",
				courtRoom: "JM-3",
				bench: "Judicial Magistrate No. 3",
				purpose: "Regular bail (first application)",
				stage: "bail",
				outcome: "Declined. Sessions offence / alleged amount. Liberty to move the Sessions Court.",
				notes: "Certified copy of the order is on the brief.",
			},
			{
				id: h2today,
				matterId: m2,
				listedOn: today,
				listedAt: "10:30",
				courtRoom: "Court 4",
				bench: "Sessions Judge, Jaipur",
				purpose: "Regular bail — BNSS 480/483; FIR 173/2026 PS Sodala; ss. 318(4), 316(2) BNS",
				stage: "bail",
			},
			{
				id: h3number,
				matterId: m3,
				listedOn: ago(5),
				listedAt: "10:30",
				courtRoom: "Registry",
				bench: "Filing",
				purpose: "Numbering / defects",
				stage: "admission",
				outcome: "Numbered as CWP 2104/2026. Defects cured. Listed for admission before the DB.",
				notes: "No caveat. Advance copy on the AAG.",
			},
			{
				id: h3admit,
				matterId: m3,
				listedOn: week,
				listedAt: "10:00",
				courtRoom: "Court 2",
				bench: "Division Bench",
				purpose: "Admission / notice — challenge to 19 Aug 2026 termination of guest faculty; stay of relieving",
				stage: "admission",
			},
		],
		tasks: [
			{
				id: newId("tk"),
				matterId: m1,
				title: "File process-server affidavit of Shri Naresh Yadav (service 18 Aug) before the 14:15 listing",
				origin: court,
				dueOn: tomorrow,
				sourceQuote: "Last order: Plaintiff to keep the process-server affidavit ready if service is disputed.",
			},
			{
				id: newId("tk"),
				matterId: m1,
				title: "Diary 16 Dec 2026 as the 120th day from service — do not take an open adjournment past that date",
				origin: statute,
				dueOn: addDaysISO(ago(12), 120),
				sourceQuote: "Commercial Courts Act / Order VIII Rule 1 — written statement forfeited after 120 days from the date of service.",
			},
			{
				id: newId("tk"),
				matterId: m1,
				title: "Draft Order XIII-A summary judgment application in the alternative if Apex only seeks time",
				origin: ai,
				dueOn: week,
				sourceQuote: "E-mail of 2 Jul 2026 admits quantity; GRNs on record; no quality dispute.",
			},
			{
				id: newId("tk"),
				matterId: m2,
				title: "Prepare oral bail arguments: Antil, civil colour, delayed FIR, ₹1.8 lakh recovery, roots, sureties",
				origin: ai,
				dueOn: today,
				sourceQuote: "Listed today 10:30 Court 4, Sessions Judge, for regular bail.",
			},
			{
				id: newId("tk"),
				matterId: m2,
				title: "Get the remand papers and confirm whether the magistrate authorised 60 or 90 days for BNSS 187",
				origin: statute,
				dueOn: today,
				sourceQuote: "Custody from 21 Aug 2026. Offences not punishable with death or life — default-bail clock is likely 60 days unless a 90-day authorisation is on file.",
			},
			{
				id: newId("tk"),
				matterId: m2,
				title: "Keep father and maternal uncle in Court 4 with ID, address proof and solvency for surety",
				origin: "lawyer",
				dueOn: today,
				sourceQuote: "If bail is granted today, bonds should be furnished the same day so he is not held on paper-work.",
			},
			{
				id: newId("tk"),
				matterId: m3,
				title: "Compile the six appointment / renewal orders, 2026–27 timetable, and the 14 Mar representation",
				origin: ai,
				dueOn: addDaysISO(today, 5),
				sourceQuote: "Admission hearing — maintainability, Uma Devi distinction, and the live timetable.",
			},
			{
				id: newId("tk"),
				matterId: m3,
				title: "Prepare a short note distinguishing Uma Devi and answering alternative remedy (Tribunal)",
				origin: ai,
				dueOn: addDaysISO(today, 6),
				sourceQuote: "State will lead with Uma Devi and alternative remedy. Need one page on each.",
			},
		],
		deadlines: [
			{
				id: newId("dl"),
				matterId: m1,
				title: "Defendant WS — Commercial Courts 120-day outer limit (service 18 Aug 2026)",
				dueOn: addDaysISO(ago(12), 120),
				origin: statute,
				sourceQuote: "Service on 18 Aug 2026 per process report. Confirm the exact service date from the affidavit before treating 16 Dec as the drop-dead date.",
			},
			{
				id: newId("dl"),
				matterId: m1,
				title: "Process-server affidavit if Apex disputes service at tomorrow's listing",
				dueOn: tomorrow,
				origin: court,
				sourceQuote: "Last order: prove service before the next date.",
			},
			{
				id: newId("dl"),
				matterId: m2,
				title: "Default-bail clock BNSS 187 — 60 days from 21 Aug 2026 unless 90 days authorised",
				dueOn: addDaysISO(ago(9), 60),
				origin: statute,
				sourceQuote: "Arrest 21 Aug 2026. 318(4)/316(2) BNS. Confirm 60 vs 90 from the remand order of JM-3.",
			},
			{
				id: newId("dl"),
				matterId: m2,
				title: "Charge-sheet watch — IO has not filed; mention if investigation is still at the complainant",
				dueOn: addDaysISO(today, 14),
				origin: ai,
				sourceQuote: "No charge-sheet as of the last production. If the IO seeks extension, oppose and diary 187.",
			},
			{
				id: newId("dl"),
				matterId: m3,
				title: "Admission listing — stay of 19 Aug termination before the semester is fully reassigned",
				dueOn: week,
				origin: court,
				sourceQuote: "2026–27 timetable still carries her name. Delay on stay makes reinstatement academic.",
			},
		],
		events: [
			{
				id: newId("ev"),
				matterId: m1,
				happenedOn: ago(40),
				kind: "note",
				title: "Client instructed",
				detail: "Eight unpaid invoices April–June 2026, aggregate ₹2.47 crore. ₹6 lakh received 11 May. Wants a commercial decree, not a long trial. Board resolution and GST papers collected.",
				origin: "lawyer",
			},
			{
				id: newId("ev"),
				matterId: m1,
				happenedOn: ago(28),
				kind: "document",
				title: "Legal notice served",
				detail: "15-day notice through counsel. Delivered 19 Jul 2026 at Apex's registered office. No reply. E-mail of 2 Jul already admits quantity.",
				origin: "lawyer",
				refId: dNotice,
			},
			{
				id: newId("ev"),
				matterId: m1,
				happenedOn: ago(22),
				kind: "document",
				title: "s.12A non-starter report",
				detail: "DLSA North-West. Apex did not appear. Report dated 8 Aug 2026 annexed to the plaint. Registry did not raise a maintainability objection.",
				origin: "statute",
			},
			{
				id: newId("ev"),
				matterId: m1,
				happenedOn: ago(20),
				kind: "filing",
				title: "Suit filed",
				detail: "CS (COMM) 412/2026, Commercial Division, Delhi High Court. Specified value ₹2.47 crore. Prayers: money decree, 18% contractual interest, costs.",
				origin: "lawyer",
				refId: h1file,
			},
			{
				id: newId("ev"),
				matterId: m1,
				happenedOn: ago(12),
				kind: "order",
				title: "Service held sufficient",
				detail: "Process report of 18 Aug 2026 taken on record. WS clock started. Next date for WS / further orders. Process-server affidavit to be kept ready.",
				origin: court,
				refId: o1,
			},
			{
				id: newId("ev"),
				matterId: m2,
				happenedOn: ago(10),
				kind: "note",
				title: "FIR registered",
				detail: "FIR 173/2026, PS Sodala, Jaipur, ss. 318(4) and 316(2) BNS. Complainant is the other partner. Alleged ₹18 lakh. 14-month delay from the first accounts dispute.",
				origin: "system",
				refId: dFir,
			},
			{
				id: newId("ev"),
				matterId: m2,
				happenedOn: ago(9),
				kind: "stage",
				title: "Arrest and first remand",
				detail: "Arrested 21 Aug 06:40 at home. ₹1.8 lakh seized. 3 days PC by JM-3. Medical NAD. Family informed.",
				origin: court,
				refId: h2arrest,
			},
			{
				id: newId("ev"),
				matterId: m2,
				happenedOn: ago(6),
				kind: "order",
				title: "PC closed — judicial custody",
				detail: "Further PC refused. JC, Central Jail Jaipur. BNSS 187 clock running from 21 Aug. No charge-sheet.",
				origin: court,
				refId: o2,
			},
			{
				id: newId("ev"),
				matterId: m2,
				happenedOn: ago(3),
				kind: "order",
				title: "Magistrate declined regular bail",
				detail: "Sessions offence / alleged amount. Liberty to move Sessions. Certified copy on the brief for today's listing.",
				origin: court,
				refId: h2magbail,
			},
			{
				id: newId("ev"),
				matterId: m3,
				happenedOn: ago(16),
				kind: "note",
				title: "Continuation representation",
				detail: "14 Mar 2026 application through the principal for 2026–27 continuation and for the vacant regular Political Science post (incumbent retired Dec 2025).",
				origin: "lawyer",
			},
			{
				id: newId("ev"),
				matterId: m3,
				happenedOn: ago(11),
				kind: "order",
				title: "Termination served",
				detail: "Collector Dausa one-page order dated 19 Aug 2026, served in the staff room at 12:40. Cites Uma Devi. No show-cause. Timetable of 1 Aug still carries her name.",
				origin: court,
				refId: o3,
			},
			{
				id: newId("ev"),
				matterId: m3,
				happenedOn: ago(9),
				kind: "document",
				title: "Representation to the Commissioner",
				detail: "21 Aug 2026. Asks for withdrawal of the order and continuation till a regular candidate joins. Unanswered.",
				origin: "lawyer",
			},
			{
				id: newId("ev"),
				matterId: m3,
				happenedOn: ago(5),
				kind: "filing",
				title: "Writ numbered",
				detail: "CWP 2104/2026, Jaipur Bench. Advance copy on AAG. Listed for admission / notice next week. No caveat.",
				origin: "system",
				refId: dWrit,
			},
		],
		documents: [
			{
				id: dNotice,
				matterId: m1,
				kind: "notice",
				title: "Legal notice dated 18 Jul 2026",
				sourceKind: "paste",
				body: `Without prejudice. Under instructions from my client Shri Vikram Sharma, proprietor of Sharma Fasteners, Wazirpur Industrial Area, Delhi.

You, Apex Traders Pvt Ltd, issued PO/APX/2026/014 dated 4 January 2026 for supply of industrial fasteners and MS fittings. Invoices INV-441 to INV-448 (April–June 2026) for ₹2,47,80,000 remain unpaid save ₹6,00,000 credited on 11 May 2026. Goods were received at your Bawana works; GRNs are with you. Your e-mail dated 2 July 2026 admits the quantity and seeks time. Clause 17 of the PO stipulates interest at 18% per annum on delayed payment.

You are called upon to pay ₹2,41,80,000 with interest at 18% p.a. from the due date of each invoice within 15 days of receipt of this notice, failing which my client shall institute a commercial suit in the Delhi High Court without further reference, and shall claim costs.

This notice is issued without prejudice to s.12A of the Commercial Courts Act, 2015.`,
			},
			{
				id: dOrder1,
				matterId: m1,
				kind: "order",
				title: "Order dated 18 Aug 2026 (service / WS)",
				sourceKind: "paste",
				body: `IN THE HIGH COURT OF DELHI AT NEW DELHI
(Commercial Division)
CS (COMM) 412/2026
Vikram Sharma v. Apex Traders Pvt Ltd

18.08.2026

Process report dated 18.08.2026 of Shri Naresh Yadav is taken on record. Service on the registered office of the defendant is held sufficient. The written statement, if any, shall be filed within the time permitted by the Commercial Courts Act, 2015 read with Order VIII Rule 1 of the Code of Civil Procedure. List on the next date of hearing for written statement / further orders. The plaintiff shall keep the process-server's affidavit ready in the event service is disputed.

Copy of this order be given dasti.`,
			},
			{
				id: dFir,
				matterId: m2,
				kind: "fir",
				title: "FIR 173/2026, PS Sodala — extract",
				sourceKind: "paste",
				body: `First Information Report No. 173/2026
Police Station Sodala, Jaipur City (West)
Date and time of report: 20.08.2026, 21:10
Offences: ss. 318(4) and 316(2) of the Bharatiya Nyaya Sanhita, 2023
Complainant: Mohan Lal s/o Kishan Lal, r/o Johri Bazar, Jaipur
Accused named: Rakesh Kumar s/o Banwari Lal, r/o Jhotwara

The complainant states that in 2023 he and the accused started a kirana wholesale business in the name of RK Traders without a registered deed. He invested about ₹12 lakh. From late 2025 the accused stopped sharing accounts. A legal notice dated 11.06.2026 demanding ₹18 lakh was served. On 20.08.2026 the complainant alleged that the accused had siphoned partnership money. Direction: register and investigate.

Arrest: 21.08.2026, 06:40, at the accused's house. Seizure: cash ₹1,80,000 from a steel almirah, one mobile, one notebook headed "RK Traders 2024-25". No other recovery. Accused produced before JM-3, Jaipur Metro, the same afternoon.`,
			},
			{
				id: dRemand,
				matterId: m2,
				kind: "order",
				title: "Remand orders 21 and 24 Aug 2026",
				sourceKind: "paste",
				body: `JM-3, Jaipur Metro. 21.08.2026. Accused Rakesh Kumar produced at 16:00. Medical: NAD. Police custody for three days for the limited purpose of confronting the seizure and the notebook. Next production 24.08.2026.

24.08.2026. IO present. Further police custody is declined. The accused is remanded to judicial custody, Central Jail, Jaipur. The investigating officer shall complete the investigation with due expedition. The period of detention shall be reckoned for the purposes of s.187 of the Bharatiya Nagarik Suraksha Sanhita, 2023 from 21.08.2026.`,
			},
			{
				id: dTerm,
				matterId: m3,
				kind: "order",
				title: "Collector, Dausa — termination dated 19 Aug 2026",
				sourceKind: "paste",
				body: `Office of the District Collector, Dausa
Order dated 19.08.2026

Subject: Disengagement of guest faculty — Government College, Dausa.

Smt. Anita Mehta, engaged as guest faculty (Political Science) from time to time since 2019, is hereby disengaged with immediate effect. The academic session is treated as closed for the purpose of her engagement. Guest faculty confers no right to regularisation or to continuation, as held in Secretary, State of Karnataka v. Uma Devi (2006) 4 SCC 1.

She shall hand over charge of answer-books and attendance registers to the Principal today. No further correspondence shall be entertained.

Sd/- Collector, Dausa
Copy to: Principal, Government College Dausa; Commissioner, College Education.`,
			},
			{
				id: dWrit,
				matterId: m3,
				kind: "petition",
				title: "CWP 2104/2026 — prayers (extract)",
				sourceKind: "paste",
				body: `IN THE HIGH COURT OF JUDICATURE FOR RAJASTHAN
JAIPUR BENCH, JAIPUR
S.B. / D.B. Civil Writ Petition No. 2104/2026

Anita Mehta v. State of Rajasthan & Ors.

Prayers:
A. Quash and set aside the Collector, Dausa order dated 19.08.2026 terminating the petitioner's engagement as guest faculty (Political Science), Government College, Dausa;
B. Direct the respondents to reinstate the petitioner with continuity of engagement and to permit her to complete the 2026–27 workload already notified in the timetable dated 01.08.2026;
C. In the alternative, direct consideration of the petitioner against the vacant regular post of Lecturer (Political Science) at the same college, the last incumbent having retired in December 2025;
D. Pending hearing, stay operation of the 19.08.2026 order and restrain the respondents from assigning the petitioner's papers to a freshly hired guest faculty;
E. Any other order in the interest of justice.

Grounds in brief: six continuous sessions after a public advertisement; perennial need; vacant regular post; no show-cause; termination mid-semester despite a live timetable; Uma Devi distinguishable; alternative remedy of the Tribunal is not equally efficacious for a contractual teacher seeking a writ of certiorari and mandamus.`,
			},
		],
		orders: [
			{
				id: o1,
				matterId: m1,
				documentId: dOrder1,
				orderDate: ago(12),
				confirmed: true,
				body: `IN THE HIGH COURT OF DELHI AT NEW DELHI (Commercial Division) CS (COMM) 412/2026. 18.08.2026. Process report dated 18.08.2026 taken on record. Service on the registered office held sufficient. Written statement within the time permitted by the Commercial Courts Act, 2015 r/w Order VIII Rule 1 CPC. List for WS / further orders. Plaintiff to keep the process-server affidavit ready if service is disputed.`,
				directions: [
					{
						text: "Defendant may file written statement only within the Commercial Courts Act outer limit.",
						party: "defendant",
						deadline: addDaysISO(ago(12), 120),
						quote: "The written statement, if any, shall be filed within the time permitted by the Commercial Courts Act, 2015",
					},
					{
						text: "Plaintiff to keep the process-server affidavit ready.",
						party: "plaintiff",
						deadline: tomorrow,
						quote: "The plaintiff shall keep the process-server's affidavit ready in the event service is disputed.",
					},
				],
			},
			{
				id: o2,
				matterId: m2,
				documentId: dRemand,
				orderDate: ago(6),
				confirmed: true,
				body: `JM-3, Jaipur Metro. 24.08.2026. Further police custody declined. Accused remanded to judicial custody, Central Jail, Jaipur. Detention to be reckoned for s.187 BNSS from 21.08.2026. Investigation to be completed with due expedition.`,
				directions: [
					{
						text: "Watch default-bail under BNSS 187 from 21 Aug 2026.",
						party: "accused",
						deadline: addDaysISO(ago(9), 60),
						quote: "The period of detention shall be reckoned for the purposes of s.187 BNSS from 21.08.2026.",
					},
				],
			},
			{
				id: o3,
				matterId: m3,
				documentId: dTerm,
				orderDate: ago(11),
				confirmed: true,
				body: `Collector, Dausa, 19.08.2026. Guest faculty engagement of Smt. Anita Mehta terminated with immediate effect. Academic session treated as closed. Uma Devi cited against regularisation. Charge of answer-books and registers to be handed over the same day.`,
				directions: [
					{
						text: "Move the writ for stay before the 2026–27 papers are reassigned.",
						party: "petitioner",
						deadline: week,
						quote: "She shall hand over charge … Relieving forthwith.",
					},
				],
			},
		],
	};
}
