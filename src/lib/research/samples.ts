import type { Intake } from "./types";

export type SampleBrief = {
  id: string;
  titleHi: string;
  titleEn: string;
  blurbHi: string;
  blurbEn: string;
  intake: Intake;
};

export const SAMPLES: SampleBrief[] = [
  {
    id: "498a-bail",
    titleHi: "498A — अग्रिम ज़मानत",
    titleEn: "498A — anticipatory bail",
    blurbHi: "सामान्य 498A FIR, कोई चोट नहीं, बच्चा 2 वर्ष, पुलिस नोटिस आ चुका है।",
    blurbEn: "General 498A FIR, no injury, two-year-old child, police notice already served.",
    intake: {
      area: "criminal",
      courtId: "rajasthan",
      side: "petitioner",
      lang: "en",
      query:
        "Whether anticipatory bail under BNSS 482 (erstwhile CrPC 438) lies for the husband and in-laws in a 498A / 323 / 406 FIR that recites only general dowry demands, names no specific date of cruelty, and is unsupported by a medical injury report — and which Supreme Court and Rajasthan High Court authorities (Arnesh Kumar; Satender Kumar Antil; Kahkashan Kausar; recent BNSS transition cases) govern conditions, notice under BNSS 35, and the risk of arrest.",
      facts: `Petitioner Vivek Sharma, 34, clerk in a nationalised bank at Jodhpur, married Priya Sharma on 12 March 2022 at Jodhpur according to Hindu rites. One daughter, aged 2 years 4 months, is with the wife at her parental home in Pal village since December 2024. There is no prior criminal history. Passport is current; he has not sought to travel.

On 3 January 2026 PS Sadar, Jodhpur City registered FIR 14/2026 for IPC 498A, 323, 406 / corresponding BNS provisions, on a complaint by Priya. The FIR alleges a demand of ₹5 lakh and a car at the time of marriage and "taunts and abuse" thereafter. It does not specify a date, place, or independent witness of any assault. The medical examination of the complainant the same evening records no external injury. Stridhan list attached to the FIR is a photocopy of wedding-gift photographs; no recovery has been attempted.

On 8 January 2026 the IO issued a notice to Vivek, his father (retired teacher, 67), and his mother (62, homemaker) to join investigation. They attended on 10 January, denied the demand, and produced bank statements showing household expenditure in Priya's name through 2024. The IO has not recorded their arrest. Neighbours (two affidavits) say the couple lived together without police complaint until Priya left in December 2024 after a dispute about living separately from the parents.

The wife's natal family has, through a common relative, indicated they would consider mediation at the DLSAs / crime-against-women cell if the petitioners undertake not to press a counter-complaint. Vivek is willing to maintain the child and to deposit a reasonable amount as a bail condition. He seeks anticipatory bail for himself and his parents before the Sessions Court, Jodhpur, with a direction to the IO not to arrest pending the investigation, relying on Arnesh Kumar v. State of Bihar on 498A arrests and on the BNSS 35 notice already complied with.

Documents on the brief: FIR 14/2026, medical report (NAD), notice dated 8 Jan 2026 and attendance memo, marriage card, child's birth certificate, six months' salary slips, two neighbour affidavits, draft undertaking as to residence and maintenance.`,
    },
  },
  {
    id: "adverse-possession",
    titleHi: "प्रतिकूल कब्ज़ा — भूमि",
    titleEn: "Adverse possession — land",
    blurbHi: "1999 से खुला कब्ज़ा, बिजली-गृहकर रामलाल के नाम; 2025 में बेदख़ली का वाद।",
    blurbEn: "Open possession since 1999; electricity and tax in possessor's name; eviction suit in 2025.",
    intake: {
      area: "property",
      courtId: "rajasthan",
      side: "respondent",
      lang: "en",
      query:
        "Whether 25 years of open, continuous and hostile possession of a 120 sq. yard residential plot at Sardarshahar, with electricity (2004) and house-tax (2006) in the possessor's name, perfects title by adverse possession against the recorded owner, and whether the 2025 suit for possession is barred by limitation (Article 65, Limitation Act, 1963) — considering Karnataka Board of Wakf v. Govt. of India, Ravinder Kaur Grewal, and the requirement to plead animus possidendi as a sword and a shield.",
      facts: `Defendant Ramlal, 71, cultivator-turned-resident of Ward 8, Sardarshahar, Churu district, Rajasthan, has occupied a 120 square yard abadi plot (khasra 214/2, old abadi) continuously since the summer of 1999. The current jamabandi still stands in the name of the plaintiff Suresh Agarwal s/o late Bhanwar Lal, a resident of Jaipur since about 2001.

In 1999 Ramlal levelled the plot, which was then a kachha depression used for dumping. In 2001 he raised a two-room kachha dwelling; in 2010 he converted it to pucca with a tin-shade kitchen. Electricity connection no. RJ-CHU-04-214088 was released in his name in March 2004 and has been billed and paid without default. House-tax receipts of the municipality from 2006–07 onwards are in his name. Two adjoining neighbours (affidavits already drafted) state that Suresh has not been seen on the plot in twenty years and that the locality has always treated it as Ramlal's house. Ramlal's name appears on the voter list at this address from 2005.

The plaintiff filed a suit in 2025 before the Civil Judge, Sardarshahar, for possession, mandatory injunction and mesne profits, pleading that in 2003 he had given "oral permission" to Ramlal to watch the plot, that no rent was fixed because it was a family arrangement (they are not related), and that a legal notice of February 2025 determined the permission. No writing, no rent receipt, no earlier notice. The suit was filed more than 12 years after Ramlal's pucca construction (2010) and more than 20 years after the electricity connection.

Ramlal's defence, to be filed as a written statement: (i) adverse possession from 1999, open, continuous, hostile, with animus; (ii) limitation under Article 65 — the plaintiff's title, if any, was extinguished; (iii) the "oral licence" story is an afterthought to save limitation; (iv) estoppel from standing by while a pucca house and civic connections were created. He does not admit the plaintiff's title even as a historical fact beyond the jamabandi entry.

Documents: jamabandi extract, electricity bills 2004–2025, house-tax file, 2010 construction photographs, neighbour affidavits, voter-list extracts, the 2025 plaint and notice, and a site plan. No sale deed in either name is on file; the plaintiff's claim rests on inheritance from Bhanwar Lal, whose own acquisition is not pleaded with a date.`,
    },
  },
  {
    id: "service-termination",
    titleHi: "सेवा समाप्ति — नैसर्गिक न्याय",
    titleEn: "Service termination — natural justice",
    blurbHi: "नियमित RPSC शिक्षक, बिना चार्जशीट/जांच 'loss of confidence' पर बर्खास्त।",
    blurbEn: "Regular RPSC teacher dismissed for 'loss of confidence' with no charge-sheet or inquiry.",
    intake: {
      area: "service",
      courtId: "rajasthan",
      side: "petitioner",
      lang: "en",
      query:
        "Whether a one-page order of the District Education Officer terminating a regularly selected government upper-primary teacher for 'loss of confidence' on an anonymous attendance complaint, without a charge-sheet, show-cause or departmental enquiry, violates Articles 14 and 311 and the Rajasthan Civil Services (Classification, Control and Appeal) Rules, and whether the proper remedy is a writ at the Jaipur Bench or the Rajasthan Civil Services Appellate Tribunal — with authorities on audi alteram partem, stigmatic termination, and reinstatement with back wages.",
      facts: `Petitioner Meera Choudhary, 41, was appointed as a Senior Teacher (Upper Primary, Science) in the Education Department, Government of Rajasthan, in August 2014 against a sanctioned post after RPSC selection (advertisement 2012, merit list 2013). Posting: Government Upper Primary School, Sikar district. She is the sole earning member; two children in school. ACRs 2018–2024 are "Good" or "Very Good". No prior penalty.

On 18 November 2025 the District Education Officer, Sikar, issued a one-page order terminating her services with immediate effect, citing "loss of confidence" and an anonymous written complaint of irregular attendance in July–August 2025. She was not given a copy of the complaint. No charge-sheet under the CCA Rules, no show-cause, no statement of allegations, no enquiry officer, no opportunity of hearing. The attendance register for those months, which she later inspected through an RTI, shows her present on all working days except three days of sanctioned casual leave (orders on file). Biometric is not installed at the school.

She submitted a representation to the Director, Elementary Education on 25 November 2025; it is unanswered. A colleague who signed the same attendance register is willing to affirm. The school continues to function with a guest teacher against her post.

She wants: (a) quashing of the 18 November order; (b) reinstatement with continuity and back wages; (c) a declaration that a stigmatic termination dressed as "loss of confidence" cannot bypass Article 311(2) and the CCA Rules for a member of the state service. She is ready to file at the Jaipur Bench of the Rajasthan High Court and needs a maintainability paragraph vis-à-vis the Rajasthan Civil Services Appellate Tribunal (whether the Tribunal's jurisdiction over "civil servants" makes the writ premature, or whether a void order without enquiry is still amenable to certiorari).

Documents: appointment order 2014, RPSC selection extract, ACRs, the 18 Nov 2025 termination, representation 25 Nov, RTI attendance extract, casual-leave sanctions, draft writ prayers.`,
    },
  },
];
