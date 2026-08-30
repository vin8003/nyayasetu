import type { OutputLang } from "@/lib/research/types";

export type StoryBeat = { time: string; title: string; note: string; day: "29" | "30" };
export type StoryPair = { night: string; morning: string };
export type StoryCopy = {
  kicker: string;
  title: string;
  dek: string;
  byline: string;
  dateline: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  pull: string;
  verifiedH: string;
  verified1: string;
  verified2: string;
  verified3: string;
  hoursH: string;
  hoursLead: string;
  beats: StoryBeat[];
  thenNowH: string;
  then: string;
  now: string;
  pairs: StoryPair[];
  sample: string;
  notH: string;
  notItems: string[];
  notNote: string;
  closeH: string;
  close1: string;
  close2: string;
  close3: string;
  sign: string;
  disclaimer: string;
  openChamber: string;
  signIn: string;
  home: string;
  volume: string;
  read: string;
  share: string;
  shared: string;
  langLabel: string;
};

export const storyCopy: Record<OutputLang, StoryCopy> = {
  en: {
    kicker: "A first-day record",
    title: "From a research desk to a chamber",
    dek: "Last night this was paste-facts, get a memo. By morning it was a practice — diary, files, orders, and cites the search actually retrieved. By night the file opened on a phone, Hindi no longer clipped, and Back meant back.",
    byline: "CiteBench",
    dateline: "29–30 August 2026",
    p1: "Yesterday evening the product (still named NyayaSetu) did one job well. An advocate pasted facts, picked a forum and a side, and got a research memo — issues, doctrines, arguments both ways, Hindi or English.",
    p2: "That was the whole product. A desk. Sign in with Google, X, or a password. Search Indian Kanoon, LiveLaw, CaseMine, eSCR, and the Supreme Court site. Not legal advice. Verify the cites yourself.",
    p3: "The gap was obvious the moment the memo landed. A working lawyer does not live in a research pane. They live in what is listed tomorrow, what the last order actually said, and whether the case on the page is real.",
    p4: "So we kept building. Morning put a chamber on main. The rest of the day put the memo on the file, let you correct a listing, and made the phone usable in Hindi.",
    pull: "The memo, the listing, and the order now sit in one place — and the software refuses to flatter a fake judgment.",
    verifiedH: "What “verified” means here",
    verified1: "The first merge was not a new screen. It was a gate.",
    verified2:
      "A precedent is verified only if its http(s) URL was actually retrieved, and only if the host is on a short allowlist. The model’s own verified: true is overwritten. javascript: links die. Invented names are stripped out of a draft before it hits the screen.",
    verified3:
      "Court drafts — notice, reply, petition, written statement — do not search the web at all. They may cite only what the memo already proved. A legal proposition with no case is kept. A fake Invented v. Case is not. That rule is the product. The chamber is furniture around it.",
    hoursH: "The hours",
    hoursLead: "First commit 29 August, 17:12 UTC. Chamber on main the next morning. The open file and the phone still being set that night.",
    beats: [
      { day: "29", time: "17:12", title: "The desk", note: "Paste facts. Get a memo. Hindi or English." },
      { day: "29", time: "18:16", title: "The gate", note: "A cite is verified only if search actually retrieved it." },
      { day: "29", time: "19:30", title: "Notice and reply", note: "Drafts from the memo. No web search on the letter." },
      { day: "29", time: "20:00", title: "Petition", note: "Prayer, interim, verification. Invented names stripped." },
      { day: "30", time: "08:08", title: "The chamber", note: "Today, diary, matters, inbox, sample file, trial." },
      { day: "30", time: "12:40", title: "The file", note: "Papers, statutes and research on the record. Edit a listing, a paper, a task. Draft this saves on the papers." },
      { day: "30", time: "16:20", title: "One system", note: "Shared type, rows and panels. Hindi labels wrap instead of clipping." },
      { day: "30", time: "22:10", title: "The phone", note: "A listing has Back. The diary stays where you left it. The tab bar stays put." },
    ],
    thenNowH: "Last night, now",
    then: "Last night",
    now: "Now",
    pairs: [
      { night: "Paste facts → a memo", morning: "The same desk, plus notice, reply, petition, and written statement from that memo" },
      { night: "Citations the model claimed", morning: "Citations the search actually retrieved" },
      { night: "One research page", morning: "Today · Diary · Matters · Research · Inbox" },
      { night: "A memo that could not sit on the file", morning: "Research, statutes and court drafts save on the matter papers" },
      { night: "No order workflow", morning: "Paste an order. The model extracts. You confirm before the diary moves." },
      { night: "No distinction of origin", morning: "Court directions and CiteBench suggestions stay different colours" },
      { night: "A listing you could not leave", morning: "Back on the sheet. The diary keeps its place." },
      { night: "NyayaSetu", morning: "CiteBench" },
    ],
    sample:
      "The sample file is a Delhi commercial recovery, a regular bail, and a Rajasthan writ. Load it, click around, throw it away. It is free and does not start the trial. Your own research is what starts the clock — thirty days, then ₹500 a month. A card is not live yet.",
    notH: "What we did not ship",
    notItems: [
      "A bot that files on eCourts",
      "Cites “verified” by fetching Indian Kanoon HTML",
      "Mixing “you should apply for X” into “the court directed X”",
      "OCR that reads a scan-only PDF",
      "Charging a card",
    ],
    notNote: "Court drafts from a matter save on the papers. Standalone desk drafts stay on screen. Card collection is not live.",
    closeH: "Why speed is the wrong headline",
    close1: "Sixteen hours got a chamber onto main. The rest of the day made it a file you can open on a phone and leave.",
    close2: "If you are an advocate: sign in, load the sample, then try your own facts. Check every date and every URL on the original record before you file.",
    close3: "If you are a builder: the interesting file is not the hero copy. It is stampPrecedents — and the listing sheet that does not eat Back.",
    sign: "CiteBench, 30 August 2026",
    disclaimer: "CiteBench is practice assistance, not legal advice.",
    openChamber: "Open the chamber",
    signIn: "Sign in",
    home: "CiteBench",
    volume: "Vol. 1, No. 1",
    read: "Four minutes",
    share: "Copy link",
    shared: "Copied",
    langLabel: "Language",
  },
  hi: {
    kicker: "पहले दिन का ब्यौरा",
    title: "शोध डेस्क से चैंबर तक",
    dek: "कल रात: तथ्य चिपकाओ, मेमो लो। सुबह: डायरी, फाइल, आदेश, और वे उद्धरण जो खोज ने सच में निकाले। रात तक फाइल फ़ोन पर खुलती है, हिंदी कटती नहीं, और वापस का मतलब वापस है.",
    byline: "CiteBench",
    dateline: "29–30 अगस्त 2026",
    p1: "कल शाम उत्पाद (तब नाम NyayaSetu था) एक काम ठीक करता था। अधिवक्ता तथ्य चिपकाते, मंच और पक्ष चुनते, और शोध मेमो पाते — मुद्दे, सिद्धांत, दोनों ओर दलीलें, हिंदी या अंग्रेज़ी।",
    p2: "पूरा उत्पाद यही था। एक डेस्क। Google, X, या पासवर्ड से लॉगिन। Indian Kanoon, LiveLaw, CaseMine, eSCR, और सर्वोच्च न्यायालय की साइट पर खोज। कानूनी सलाह नहीं। साइटेशन स्वयं जाँचें।",
    p3: "मेमो आते ही कमी साफ़ थी। चलता वकील शोध पैन में नहीं रहता। वह रहता है कल की पेशी में, पिछले आदेश में जो अदालत ने सच में कहा, और इस बात में कि पन्ने पर जो केस है वह असल है या नहीं।",
    p4: "इसलिए हम बनाते रहे। सुबह चैंबर मेन पर आ गया। बाकी दिन मेमो फाइल पर बैठा, पेशी सुधारी जा सकी, और फ़ोन हिंदी में चलने लगा।",
    pull: "मेमो, पेशी, और आदेश अब एक जगह हैं — और यह सॉफ़्टवेयर नकली निर्णय की चापलूसी नहीं करता।",
    verifiedH: "यहाँ “सत्यापित” का मतलब",
    verified1: "पहला मर्ज नई स्क्रीन नहीं था। एक द्वार था।",
    verified2:
      "पूर्व निर्णय तभी सत्यापित जब उसका http(s) पता सच में प्राप्त हुआ हो, और मेज़बान छोटी अनुमति-सूची में हो। मॉडल का अपना verified: true मिटा दिया जाता है। javascript: लिंक नहीं चलते। ड्राफ्ट पर आने से पहले गढ़े नाम काट दिए जाते हैं।",
    verified3:
      "अदालती ड्राफ्ट — नोटिस, जवाब, याचिका, लिखित कथन — वेब खोजते ही नहीं। वे केवल वही उद्धृत कर सकते हैं जो मेमो पहले सिद्ध कर चुका। बिना केस की दलील रह सकती है। नकली Invented v. Case नहीं। यही नियम उत्पाद है। चैंबर उसके इर्द-गिर्द फर्नीचर है।",
    hoursH: "घंटे",
    hoursLead: "पहला कमिट 29 अगस्त, 17:12 UTC। अगली सुबह चैंबर मेन पर। खुली फाइल और फ़ोन उसी रात तक सेट हो रहे थे।",
    beats: [
      { day: "29", time: "17:12", title: "डेस्क", note: "तथ्य चिपकाओ। मेमो लो। हिंदी या अंग्रेज़ी।" },
      { day: "29", time: "18:16", title: "द्वार", note: "साइटेशन तभी सत्यापित जब खोज ने सच में लिंक निकाला हो।" },
      { day: "29", time: "19:30", title: "नोटिस और जवाब", note: "मेमो से ड्राफ्ट। पत्र पर वेब सर्च नहीं।" },
      { day: "29", time: "20:00", title: "याचिका", note: "प्रार्थना, अंतरिम, सत्यापन। गढ़े नाम कटे।" },
      { day: "30", time: "08:08", title: "चैंबर", note: "आज, डायरी, मामले, इनबॉक्स, नमूना फाइल, आज़माइश।" },
      { day: "30", time: "12:40", title: "फाइल", note: "कागज़, क़ानून और शोध रिकॉर्ड पर। पेशी, कागज़, कार्य संपादन। ड्राफ्ट कागज़ों पर सहेजता है।" },
      { day: "30", time: "16:20", title: "एक प्रणाली", note: "साझा टाइप, पंक्तियाँ, पैनल। हिंदी कटती नहीं, लपेटती है।" },
      { day: "30", time: "22:10", title: "फ़ोन", note: "पेशी पर वापस। डायरी जहाँ छोड़ी। टैब बार टिका रहता है।" },
    ],
    thenNowH: "कल रात, अब",
    then: "कल रात",
    now: "अब",
    pairs: [
      { night: "तथ्य → मेमो", morning: "वही डेस्क, साथ में नोटिस, जवाब, याचिका, लिखित कथन" },
      { night: "मॉडल के दावे वाले उद्धरण", morning: "खोज से मिले उद्धरण" },
      { night: "एक शोध पन्ना", morning: "आज · डायरी · मामले · शोध · इनबॉक्स" },
      { night: "मेमो फाइल पर नहीं बैठता", morning: "शोध, क़ानून और अदालती ड्राफ्ट मामले के कागज़ों पर सहेजते हैं" },
      { night: "आदेश की कोई प्रक्रिया नहीं", morning: "आदेश चिपकाओ। मॉडल निकाले। डायरी से पहले आप पुष्टि करो।" },
      { night: "स्रोत एक जैसे", morning: "अदालत का निर्देश और CiteBench का सुझाव अलग रंग" },
      { night: "पेशी से निकलना नहीं", morning: "शीट पर वापस। डायरी अपनी जगह पर।" },
      { night: "NyayaSetu", morning: "CiteBench" },
    ],
    sample:
      "नमूना फाइल: दिल्ली वाणिज्यिक वसूली, नियमित ज़मानत, राजस्थान रिट। खोलो, घूमो, हटा दो। मुफ़्त है, आज़माइश नहीं चलती। घड़ी तब चलती है जब आप अपना शोध करते हो — तीस दिन, फिर ₹500 महीना। कार्ड अभी नहीं।",
    notH: "जो नहीं भेजा",
    notItems: [
      "eCourts पर दाखिल करने वाला बॉट",
      "Indian Kanoon HTML लाकर “सत्यापित” साइटेशन",
      "“आप X के लिए आवेदन करें” को “अदालत ने X कहा” में मिलाना",
      "केवल स्कैन वाले PDF का OCR",
      "कार्ड काटना",
    ],
    notNote: "मामले से निकले अदालती ड्राफ्ट कागज़ों पर सहेजते हैं। अकेले डेस्क के ड्राफ्ट स्क्रीन पर रहते हैं। कार्ड अभी नहीं।",
    closeH: "रफ़्तार गलत शीर्षक है",
    close1: "सोलह घंटे में चैंबर मेन पर आया। बाकी दिन ने उसे फाइल बना दिया जिसे फ़ोन पर खोलो और छोड़ो।",
    close2: "अधिवक्ता हैं तो लॉगिन करें, नमूना खोलें, फिर अपने तथ्य आज़माएँ। फाइल करने से पहले हर तारीख और हर पता मूल रिकॉर्ड पर जाँचें।",
    close3: "बिल्डर हैं तो दिलचस्प फाइल हीरो कॉपी नहीं है। stampPrecedents है — और वह पेशी शीट जो वापस निगलती नहीं।",
    sign: "CiteBench, 30 अगस्त 2026",
    disclaimer: "CiteBench प्रैक्टिस सहायता है, कानूनी सलाह नहीं।",
    openChamber: "चैंबर खोलें",
    signIn: "लॉगिन",
    home: "CiteBench",
    volume: "अंक १",
    read: "चार मिनट",
    share: "लिंक कॉपी करें",
    shared: "कॉपी हो गया",
    langLabel: "भाषा",
  },
};
