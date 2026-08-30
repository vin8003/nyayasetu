import type { OutputLang } from "@/lib/research/types";

export type StoryBeat = { time: string; title: string; note: string };
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
};

export const storyCopy: Record<OutputLang, StoryCopy> = {
  en: {
    kicker: "A first-day record",
    title: "From a research desk to a chamber",
    dek: "Last night this was paste-facts, get a memo. This morning it is a practice — diary, files, orders, and cites the search actually retrieved. Under sixteen hours.",
    byline: "CiteBench",
    dateline: "29–30 August 2026",
    p1: "Yesterday evening the product (still named NyayaSetu) did one job well. An advocate pasted facts, picked a forum and a side, and got a research memo — issues, doctrines, arguments both ways, Hindi or English.",
    p2: "That was the whole product. A desk. Sign in with Google, X, or a password. Search Indian Kanoon, LiveLaw, CaseMine, eSCR, and the Supreme Court site. Not legal advice. Verify the cites yourself.",
    p3: "The gap was obvious the moment the memo landed. A working lawyer does not live in a research pane. They live in what is listed tomorrow, what the last order actually said, and whether the case on the page is real.",
    p4: "So we kept building.",
    pull: "The memo, the listing, and the order now sit in one place — and the software refuses to flatter a fake judgment.",
    verifiedH: "What “verified” means here",
    verified1: "The first merge was not a new screen. It was a gate.",
    verified2:
      "A precedent is verified only if its http(s) URL was actually retrieved, and only if the host is on a short allowlist. The model’s own verified: true is overwritten. javascript: links die. Invented names are stripped out of a draft before it hits the screen.",
    verified3:
      "Court drafts — notice, reply, petition — do not search the web at all. They may cite only what the memo already proved. A legal proposition with no case is kept. A fake Invented v. Case is not. That rule is the product. The chamber is furniture around it.",
    hoursH: "The hours",
    hoursLead: "First commit 29 August, 17:12 UTC. Chamber on main the next morning.",
    beats: [
      { time: "17:12", title: "The desk", note: "Paste facts. Get a memo. Hindi or English." },
      { time: "18:16", title: "The gate", note: "A cite is verified only if search actually retrieved it." },
      { time: "19:30", title: "Notice and reply", note: "Drafts from the memo. No web search on the letter." },
      { time: "20:00", title: "Petition", note: "Prayer, interim, verification. Invented names stripped." },
      { time: "08:08", title: "The chamber", note: "Today, diary, matters, inbox, sample file, trial." },
    ],
    thenNowH: "Last night, this morning",
    then: "Last night",
    now: "This morning",
    pairs: [
      { night: "Paste facts → a memo", morning: "The same desk, plus notice, reply, and petition from that memo" },
      { night: "Citations the model claimed", morning: "Citations the search actually retrieved" },
      { night: "One research page", morning: "Today · Diary · Matters · Research · Inbox" },
      { night: "No order workflow", morning: "Paste an order. The model extracts. You confirm before the diary moves." },
      { night: "No distinction of origin", morning: "Court directions and CiteBench suggestions stay different colours" },
      { night: "NyayaSetu", morning: "CiteBench" },
    ],
    sample:
      "The sample file is a Delhi commercial recovery, a regular bail, and a Rajasthan writ. Load it, click around, throw it away. It is free and does not start the trial. Your own research is what starts the clock — thirty days, then ₹500 a month. A card is not live yet.",
    notH: "What we did not ship",
    notItems: [
      "A bot that files on eCourts",
      "Cites “verified” by fetching Indian Kanoon HTML",
      "Mixing “you should apply for X” into “the court directed X”",
      "Saving notice, reply, or petition into the database — still a first cut on screen",
      "Charging a card",
    ],
    notNote: "Written statement from the memo is on a branch. It is not on main, so it is not in this story.",
    closeH: "Why speed is the wrong headline",
    close1: "Sixteen hours is a curiosity. The useful sentence is the pull quote above.",
    close2: "If you are an advocate: sign in, load the sample, then try your own facts. Check every date and every URL on the original record before you file.",
    close3: "If you are a builder: the interesting file is not the hero copy. It is stampPrecedents.",
    sign: "CiteBench, 30 August 2026",
    disclaimer: "CiteBench is practice assistance, not legal advice.",
    openChamber: "Open the chamber",
    signIn: "Sign in",
    home: "CiteBench",
  },
  hi: {
    kicker: "पहले दिन का ब्यौरा",
    title: "शोध डेस्क से चैंबर तक",
    dek: "कल रात: तथ्य चिपकाओ, मेमो लो। आज सुबह: डायरी, फाइल, आदेश, और वे उद्धरण जो खोज ने सच में निकाले। सोलह घंटे से कम।",
    byline: "CiteBench",
    dateline: "29–30 अगस्त 2026",
    p1: "कल शाम उत्पाद (तब नाम NyayaSetu था) एक काम ठीक करता था। अधिवक्ता तथ्य चिपकाते, मंच और पक्ष चुनते, और शोध मेमो पाते — मुद्दे, सिद्धांत, दोनों ओर दलीलें, हिंदी या अंग्रेज़ी।",
    p2: "पूरा उत्पाद यही था। एक डेस्क। Google, X, या पासवर्ड से लॉगिन। Indian Kanoon, LiveLaw, CaseMine, eSCR, और सर्वोच्च न्यायालय की साइट पर खोज। कानूनी सलाह नहीं। साइटेशन स्वयं जाँचें।",
    p3: "मेमो आते ही कमी साफ़ थी। चलता वकील शोध पैन में नहीं रहता। वह रहता है कल की पेशी में, पिछले आदेश में जो अदालत ने सच में कहा, और इस बात में कि पन्ने पर जो केस है वह असल है या नहीं।",
    p4: "इसलिए हम बनाते रहे।",
    pull: "मेमो, पेशी, और आदेश अब एक जगह हैं — और यह सॉफ़्टवेयर नकली निर्णय की चापलूसी नहीं करता।",
    verifiedH: "यहाँ “सत्यापित” का मतलब",
    verified1: "पहला मर्ज नई स्क्रीन नहीं था। एक द्वार था।",
    verified2:
      "पूर्व निर्णय तभी सत्यापित जब उसका http(s) पता सच में प्राप्त हुआ हो, और मेज़बान छोटी अनुमति-सूची में हो। मॉडल का अपना verified: true मिटा दिया जाता है। javascript: लिंक नहीं चलते। ड्राफ्ट पर आने से पहले गढ़े नाम काट दिए जाते हैं।",
    verified3:
      "अदालती ड्राफ्ट — नोटिस, जवाब, याचिका — वेब खोजते ही नहीं। वे केवल वही उद्धृत कर सकते हैं जो मेमो पहले सिद्ध कर चुका। बिना केस की दलील रह सकती है। नकली Invented v. Case नहीं। यही नियम उत्पाद है। चैंबर उसके इर्द-गिर्द फर्नीचर है।",
    hoursH: "घंटे",
    hoursLead: "पहला कमिट 29 अगस्त, 17:12 UTC। अगली सुबह चैंबर मेन पर।",
    beats: [
      { time: "17:12", title: "डेस्क", note: "तथ्य चिपकाओ। मेमो लो। हिंदी या अंग्रेज़ी।" },
      { time: "18:16", title: "द्वार", note: "साइटेशन तभी सत्यापित जब खोज ने सच में लिंक निकाला हो।" },
      { time: "19:30", title: "नोटिस और जवाब", note: "मेमो से ड्राफ्ट। पत्र पर वेब सर्च नहीं।" },
      { time: "20:00", title: "याचिका", note: "प्रार्थना, अंतरिम, सत्यापन। गढ़े नाम कटे।" },
      { time: "08:08", title: "चैंबर", note: "आज, डायरी, मामले, इनबॉक्स, नमूना फाइल, आज़माइश।" },
    ],
    thenNowH: "कल रात, आज सुबह",
    then: "कल रात",
    now: "आज सुबह",
    pairs: [
      { night: "तथ्य → मेमो", morning: "वही डेस्क, साथ में नोटिस, जवाब, याचिका" },
      { night: "मॉडल के दावे वाले उद्धरण", morning: "खोज से मिले उद्धरण" },
      { night: "एक शोध पन्ना", morning: "आज · डायरी · मामले · शोध · इनबॉक्स" },
      { night: "आदेश की कोई प्रक्रिया नहीं", morning: "आदेश चिपकाओ। मॉडल निकाले। डायरी से पहले आप पुष्टि करो।" },
      { night: "स्रोत एक जैसे", morning: "अदालत का निर्देश और CiteBench का सुझाव अलग रंग" },
      { night: "NyayaSetu", morning: "CiteBench" },
    ],
    sample:
      "नमूना फाइल: दिल्ली वाणिज्यिक वसूली, नियमित ज़मानत, राजस्थान रिट। खोलो, घूमो, हटा दो। मुफ़्त है, आज़माइश नहीं चलती। घड़ी तब चलती है जब आप अपना शोध करते हो — तीस दिन, फिर ₹500 महीना। कार्ड अभी नहीं।",
    notH: "जो नहीं भेजा",
    notItems: [
      "eCourts पर दाखिल करने वाला बॉट",
      "Indian Kanoon HTML लाकर “सत्यापित” साइटेशन",
      "“आप X के लिए आवेदन करें” को “अदालत ने X कहा” में मिलाना",
      "नोटिस, जवाब, याचिका को डेटाबेस में सहेजना — अभी स्क्रीन पर पहला ड्राफ्ट",
      "कार्ड काटना",
    ],
    notNote: "मेमो से लिखित कथन एक शाखा पर है। मेन पर नहीं, इसलिए इस कहानी में नहीं।",
    closeH: "रफ़्तार गलत शीर्षक है",
    close1: "सोलह घंटे एक जिज्ञासा है। काम की बात ऊपर का उद्धरण है।",
    close2: "अधिवक्ता हैं तो लॉगिन करें, नमूना खोलें, फिर अपने तथ्य आज़माएँ। फाइल करने से पहले हर तारीख और हर पता मूल रिकॉर्ड पर जाँचें।",
    close3: "बिल्डर हैं तो दिलचस्प फाइल हीरो कॉपी नहीं है। stampPrecedents है।",
    sign: "CiteBench, 30 अगस्त 2026",
    disclaimer: "CiteBench प्रैक्टिस सहायता है, कानूनी सलाह नहीं।",
    openChamber: "चैंबर खोलें",
    signIn: "लॉगिन",
    home: "CiteBench",
  },
};
