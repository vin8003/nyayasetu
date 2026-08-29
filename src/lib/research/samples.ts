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
    blurbHi: "ससुराल वालों पर क्रूरता का केस, कोई चोट नहीं, समझौते की बात।",
    blurbEn: "Cruelty FIR against in-laws, no injury, talk of settlement.",
    intake: {
      area: "criminal",
      courtId: "rajasthan",
      side: "petitioner",
      lang: "hi",
      query:
        "क्या पति और ससुराल वालों को CrPC 438 / BNSS 482 के तहत अग्रिम ज़मानत मिल सकती है जब FIR में सामान्य आरोप हों और कोई मेडिकल इंजरी न हो?",
      facts: `याचिकाकर्ता विवेक शर्मा, उम्र 34, जोधपुर निवासी, की शादी 12 मार्च 2022 को प्रिया शर्मा से हुई। दिसंबर 2024 से पत्नी मायके में हैं। 3 जनवरी 2026 को जोधपुर में IPC 498A, 323, 406 / BNS समकक्ष धाराओं में FIR दर्ज हुई — आरोप दहेज की माँग (₹5 लाख और कार) तथा गाली-गलौज के हैं। मेडिकल रिपोर्ट में कोई चोट नहीं। कोई विशिष्ट तारीख या गवाह का ब्योरा FIR में नहीं। दंपत्ति के एक बच्चा (2 वर्ष) है। पति बैंक में क्लर्क है, कोई पूर्व आपराधिक इतिहास नहीं। परिवार ने मध्यस्थता की पेशकश की है। पुलिस ने पूछताछ के लिए नोटिस भेजा है। याचिकाकर्ता अग्रिम ज़मानत चाहते हैं।`,
    },
  },
  {
    id: "adverse-possession",
    titleHi: "प्रतिकूल कब्ज़ा — भूमि",
    titleEn: "Adverse possession — land",
    blurbHi: "25 साल से काबिज प्लॉट, अब रिकॉर्ड मालिक बेदख़ली चाहता है।",
    blurbEn: "In possession 25 years; record owner now wants eviction.",
    intake: {
      area: "property",
      courtId: "rajasthan",
      side: "respondent",
      lang: "hi",
      query:
        "क्या 25 वर्षों के खुले और निरंतर कब्ज़े से प्रतिकूल कब्ज़े का स्वत्व बनता है, और रिकॉर्ड मालिक का बेदख़ली वाद कितना मज़बूत है?",
      facts: `प्रतिवादी रामलाल, सरदारशहर (चuru), राजस्थान, 1999 से एक 120 वर्ग गज आवासीय प्लॉट पर काबिज हैं। प्लॉट का जमाबंदी अभी भी वादी सुरेश अग्रवाल के नाम है। रामलाल ने 2001 में कच्चा मकान बनाया, 2010 में पक्का किया, बिजली कनेक्शन 2004 से उनके नाम, गृहकर रसीदें 2006 से उनके पास हैं। पड़ोसी शपथपत्र कहते हैं कि वादी 20 साल से गाँव नहीं आए। वादी का दावा है कि उन्होंने 2003 में मौखिक अनुमति से रखा था, किराया कभी तय नहीं हुआ। 2025 में वादी ने सिविल जज के यहाँ कब्ज़ा वापसी और निषेधाज्ञा का वाद दायर किया। प्रतिवादी प्रतिकूल कब्ज़े और परिसीमा का बचाव करना चाहते हैं।`,
    },
  },
  {
    id: "service-termination",
    titleHi: "सेवा समाप्ति — नैसर्गिक न्याय",
    titleEn: "Service termination — natural justice",
    blurbHi: "सरकारी शिक्षक को बिना जाँच बर्खास्त किया गया।",
    blurbEn: "Government teacher dismissed without an inquiry.",
    intake: {
      area: "service",
      courtId: "sc",
      side: "petitioner",
      lang: "en",
      query:
        "Is termination of a government teacher without inquiry or show-cause violative of natural justice and Articles 14/311? What is the proper writ remedy?",
      facts: `The petitioner, Meera Choudhary, was appointed as a government upper-primary teacher in Rajasthan in 2014 on a regular sanctioned post after RPSC selection. On 18 November 2025 the District Education Officer issued a one-page order terminating her services citing “loss of confidence” and an anonymous complaint of irregular attendance, without a charge-sheet, without a show-cause notice, and without a departmental enquiry. She was not given the complaint. Past ACRs are “Good” or “Very Good”. She has two minor children and is the sole earning member. She wants reinstatement with back wages through a writ petition, and asks whether the civil court or the Central/State Administrative Tribunal is the correct forum, and which Supreme Court authorities on audi alteram partem and Article 311 govern.`,
    },
  },
];
