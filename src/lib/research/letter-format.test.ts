import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LegalMemo, Precedent } from "./types.ts";
import { assembleLetter, formatLegalLetter, formatLegalLetterHtml, letterChrome } from "./letter-format.ts";
import type { ParsedLetterDraft } from "./letter-parse.ts";
import { t } from "./copy.ts";

function caseRow(patch: Partial<Precedent> = {}): Precedent {
  return {
    title: "Arnesh Kumar v. State of Bihar",
    citation: "(2014) 8 SCC 273",
    court: "Supreme Court of India",
    year: "2014",
    ratio: "Arrest in 498A cases requires recorded reasons.",
    factsOverlap: "",
    holding: "",
    howToUse: "",
    url: "https://indiankanoon.org/doc/322621/",
    binding: "binding",
    verified: true,
    ...patch,
  };
}

const memo: LegalMemo = {
  title: "498A anticipatory bail",
  causeTitle: "Vivek v. State (Rajasthan HC)",
  courtsConsulted: [],
  factsSummary: "General 498A allegations, no injury.",
  issues: [],
  statutes: [],
  doctrines: [],
  precedents: [
    caseRow(),
    caseRow({
      title: "Invented Case",
      citation: "(2020) 1 SCC 1",
      url: "https://indiankanoon.org/doc/0/",
      verified: false,
    }),
  ],
  pointsForCourt: [],
  argumentsFor: [],
  argumentsAgainst: [],
  counters: [],
  strategy: "",
  risks: ["Interim protection may be conditional."],
  fullMemo: "Complete written opinion.",
  sources: [],
  unverified: ["Invented Case"],
  searchedQueries: [],
  citationUrls: ["https://indiankanoon.org/doc/322621/"],
};

const draft: ParsedLetterDraft = {
  heading: "Legal notice regarding 498A FIR",
  parties: "From: Vivek Sharma\nTo: Investigating Officer, Jodhpur",
  facts: "FIR with general allegations and no medical injury.",
  grounds: [
    {
      heading: "Arrest requires recorded reasons",
      text: "Mechanical arrest in 498A is impermissible.",
      citation: "(2014) 8 SCC 273",
      url: "https://indiankanoon.org/doc/322621/",
    },
    {
      heading: "Invented Case",
      text: "This fake ratio must not appear in the letter.",
      citation: "(2020) 1 SCC 1",
      url: "https://indiankanoon.org/doc/0/",
    },
  ],
  closing: "You are called upon to refrain from coercive process.",
  timeOrStand: "Fifteen days from receipt of this notice.",
  risks: "Interim protection may be conditional.",
  verification: "",
};

describe("assembleLetter / formatLegalLetter", () => {
  it("notice includes parties, facts, verified citation+URL, demand, time to comply, risks, and disclaimer", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const text = formatLegalLetter(letter);
    assert.match(text, /Legal notice regarding 498A FIR/);
    assert.match(text, /Vivek Sharma/);
    assert.match(text, /general allegations/);
    assert.match(text, /\(2014\) 8 SCC 273/);
    assert.match(text, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    assert.match(text, /refrain from coercive process/);
    assert.match(text, /Fifteen days/);
    assert.match(text, /Interim protection may be conditional/);
    assert.match(text, /research assistance for advocates, not legal advice/i);
    assert.match(text, /Time to comply|time to comply/i);
    assert.doesNotMatch(text, /Without prejudice/i);
  });

  it("reply is without prejudice, para-wise, with a stand rather than a demand/time heading", () => {
    const letter = assembleLetter({
      kind: "reply",
      lang: "en",
      draft: {
        ...draft,
        heading: "Reply to legal notice",
        closing: "Each allegation is denied save what is expressly admitted.",
        timeOrStand: "The noticee will contest any coercive process.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    assert.match(text, /Without prejudice/i);
    assert.match(text, /Reply to legal notice|para-wise/i);
    assert.match(text, /contest any coercive process/);
    assert.match(text, /Stand/i);
    assert.doesNotMatch(text, /Time to comply/i);
    assert.match(text, /\(2014\) 8 SCC 273/);
  });

  it("excludes unverified authorities from the assembled letter body", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const text = formatLegalLetter(letter);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /indiankanoon\.org\/doc\/0/);
    assert.doesNotMatch(text, /\(2020\) 1 SCC 1/);
    assert.doesNotMatch(text, /fake ratio/);
  });

  it("strips unverified case names that the model planted in facts or the demand", () => {
    const letter = assembleLetter({
      kind: "notice",
      lang: "en",
      draft: {
        ...draft,
        facts: "Relying on Invented Case (2020) 1 SCC 1 the FIR is vague.",
        closing: "See also https://indiankanoon.org/doc/0/ and Invented Case.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /\(2020\) 1 SCC 1/);
    assert.doesNotMatch(text, /indiankanoon\.org\/doc\/0/);
    assert.match(text, /FIR is vague/);
    assert.match(text, /Arnesh Kumar|8 SCC 273/);
  });

  it("uses Hindi labels and the Hindi disclaimer when the memo language is hi", () => {
    const letter = assembleLetter({ kind: "notice", lang: "hi", draft, memo });
    const text = formatLegalLetter(letter);
    const hi = t("hi");
    assert.match(text, new RegExp(hi.disclaimer.slice(0, 20)));
    assert.match(text, /पक्षकार|तथ्य|माँग|पालन/);
  });

  it("wraps the letter as downloadable HTML for Word", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const html = formatLegalLetterHtml(letter);
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /498A/);
    assert.match(html, /indiankanoon/);
  });

  it("petition is a court pleading with prayer, interim relief, verification, and no notice/reply shape", () => {
    const letter = assembleLetter({
      kind: "petition",
      lang: "en",
      draft: {
        ...draft,
        heading: "Petition for anticipatory bail under BNSS 482",
        parties: "Vivek Sharma, Petitioner\nState of Rajasthan, Respondent",
        closing: "It is therefore prayed that this Hon'ble Court grant anticipatory bail.",
        timeOrStand: "Ex parte interim protection from arrest pending disposal.",
        verification: "I, Vivek Sharma, do hereby verify that the contents are true to my knowledge.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    assert.match(text, /Petition for anticipatory bail/);
    assert.match(text, /Vivek Sharma, Petitioner/);
    assert.match(text, /Prayer/i);
    assert.match(text, /grant anticipatory bail/);
    assert.match(text, /Interim relief/i);
    assert.match(text, /Ex parte interim protection/);
    assert.match(text, /Verification/i);
    assert.match(text, /true to my knowledge/);
    assert.match(text, /\(2014\) 8 SCC 273/);
    assert.match(text, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    assert.match(text, /research assistance for advocates, not legal advice/i);
    assert.doesNotMatch(text, /Without prejudice/i);
    assert.doesNotMatch(text, /Time to comply/i);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /fake ratio/);
  });

  it("strips unverified case names planted in a petition verification clause", () => {
    const letter = assembleLetter({
      kind: "petition",
      lang: "en",
      draft: {
        ...draft,
        heading: "Petition for anticipatory bail",
        closing: "It is therefore prayed that anticipatory bail be granted.",
        timeOrStand: "Interim protection from arrest.",
        verification: "I verify this petition and rely on Invented Case (2020) 1 SCC 1.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /\(2020\) 1 SCC 1/);
    assert.match(text, /I verify this petition/);
    assert.match(text, /Verification/i);
  });

  it("drops a verification clause from notice and reply drafts", () => {
    const notice = assembleLetter({
      kind: "notice",
      lang: "en",
      draft: { ...draft, verification: "I, Vivek Sharma, do hereby verify these contents." },
      memo,
    });
    assert.equal(notice.verification, "");
    assert.doesNotMatch(formatLegalLetter(notice), /do hereby verify/);
    assert.doesNotMatch(formatLegalLetter(notice), /Verification/i);

    const reply = assembleLetter({
      kind: "reply",
      lang: "en",
      draft: {
        ...draft,
        heading: "Reply to legal notice",
        closing: "Each allegation is denied save what is expressly admitted.",
        timeOrStand: "The noticee will contest any coercive process.",
        verification: "I, Vivek Sharma, do hereby verify these contents.",
      },
      memo,
    });
    assert.equal(reply.verification, "");
    assert.doesNotMatch(formatLegalLetter(reply), /do hereby verify/);
  });

  it("petition Hindi labels include prayer, interim relief, and verification", () => {
    const letter = assembleLetter({
      kind: "petition",
      lang: "hi",
      draft: {
        ...draft,
        heading: "अग्रिम ज़मानत याचिका",
        closing: "अग्रिम ज़मानत दी जाए।",
        timeOrStand: "अंतरिम सुरक्षा।",
        verification: "मैं सत्यता की पुष्टि करता हूँ।",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    const hi = t("hi");
    const chrome = letterChrome("petition", hi);
    assert.equal(chrome.closingHeading, hi.letterPrayer);
    assert.equal(chrome.followOnHeading, hi.letterInterim);
    assert.equal(chrome.verificationHeading, hi.letterVerification);
    assert.match(text, new RegExp(hi.letterPrayer));
    assert.match(text, new RegExp(hi.letterInterim));
    assert.match(text, new RegExp(hi.letterVerification));
    assert.match(text, new RegExp(hi.disclaimer.slice(0, 20)));
  });

  it("maps every letter kind to its own headings so copy and screen stay aligned", () => {
    const en = t("en");
    const notice = letterChrome("notice", en);
    const reply = letterChrome("reply", en);
    const petition = letterChrome("petition", en);
    const writtenStatement = letterChrome("writtenStatement", en);
    assert.equal(notice.closingHeading, en.letterDemand);
    assert.equal(notice.followOnHeading, en.letterTime);
    assert.equal(notice.verificationHeading, "");
    assert.equal(notice.followOnFirst, false);
    assert.equal(reply.withoutPrejudice, true);
    assert.equal(reply.groundsHeading, en.letterParaReply);
    assert.equal(reply.closingHeading, "");
    assert.equal(reply.followOnHeading, en.letterStand);
    assert.equal(reply.followOnFirst, false);
    assert.equal(petition.closingHeading, en.letterPrayer);
    assert.equal(petition.followOnHeading, en.letterInterim);
    assert.equal(petition.verificationHeading, en.letterVerification);
    assert.equal(petition.followOnFirst, false);
    assert.equal(writtenStatement.followOnHeading, en.letterPrelim);
    assert.equal(writtenStatement.followOnFirst, true);
  });

  it("written statement is a court pleading with para-wise reply, prayer, preliminary objections, and verification", () => {
    const letter = assembleLetter({
      kind: "writtenStatement",
      lang: "en",
      draft: {
        ...draft,
        heading: "Written statement on behalf of the respondent",
        parties: "State of Rajasthan, Respondent\nVivek Sharma, Petitioner",
        facts: "The respondent denies cruelty and injury.",
        closing: "It is therefore prayed that the petition be dismissed with costs.",
        timeOrStand: "The petition is not maintainable for want of territorial jurisdiction.",
        verification: "I, IO Sharma, do hereby verify that the contents are true to my knowledge.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    const en = t("en");
    assert.match(text, /Written statement on behalf of the respondent/);
    assert.match(text, new RegExp(en.letterWsKicker));
    assert.match(text, new RegExp(en.letterParaReply));
    assert.match(text, new RegExp(en.letterPrayer));
    assert.match(text, /dismissed with costs/);
    assert.match(text, new RegExp(en.letterPrelim));
    assert.match(text, /territorial jurisdiction/);
    assert.match(text, new RegExp(en.letterVerification));
    assert.match(text, /true to my knowledge/);
    assert.match(text, /\(2014\) 8 SCC 273/);
    assert.match(text, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    assert.ok(text.indexOf(en.letterPrelim) < text.indexOf(en.letterParaReply));
    assert.ok(text.indexOf(en.letterPrelim) < text.indexOf(en.letterPrayer));
    assert.ok(text.indexOf(en.letterParaReply) < text.indexOf(en.letterPrayer));
    assert.doesNotMatch(text, /Without prejudice/i);
    assert.doesNotMatch(text, /Time to comply/i);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /fake ratio/);
  });

  it("written statement Hindi labels include para-wise reply, prayer, preliminary objections, and verification", () => {
    const letter = assembleLetter({
      kind: "writtenStatement",
      lang: "hi",
      draft: {
        ...draft,
        heading: "लिखित कथन",
        closing: "याचिका खारिज की जाए।",
        timeOrStand: "अधिकारिता नहीं है।",
        verification: "मैं सत्यता की पुष्टि करता हूँ।",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    const hi = t("hi");
    assert.match(text, new RegExp(hi.letterWsKicker));
    assert.match(text, new RegExp(hi.letterParaReply));
    assert.match(text, new RegExp(hi.letterPrayer));
    assert.match(text, new RegExp(hi.letterPrelim));
    assert.match(text, new RegExp(hi.letterVerification));
    assert.match(text, new RegExp(hi.disclaimer.slice(0, 20)));
  });
});
