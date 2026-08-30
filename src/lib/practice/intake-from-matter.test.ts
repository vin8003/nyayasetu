import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { intakeFromMatter, mapCourtId, mapPracticeArea, mapSide } from "./intake-from-matter.ts";
import type { Matter, MatterBundle } from "./types.ts";

function matter(patch: Partial<Matter> = {}): Matter {
  return {
    id: "mt_1",
    clientId: "cl_1",
    clientName: "Vikram Sharma",
    title: "Sharma v Apex Traders Pvt Ltd",
    proceeding: "commercial",
    stage: "ws_pending",
    courtName: "Delhi High Court (Commercial)",
    caseNumber: "CS (COMM) 412/2026",
    cnr: "DLHC01-012345-2026",
    caseType: "CS (COMM)",
    jurisdiction: "Delhi",
    ourSide: "petitioner",
    parties: [
      { role: "Plaintiff", name: "Vikram Sharma" },
      { role: "Defendant", name: "Apex Traders Pvt Ltd" },
    ],
    status: "active",
    nextHearingOn: "2026-09-01",
    lastOrderOn: "2026-08-18",
    notes: "Research question: After service of summons, is the 120-day commercial WS limit mandatory?\n\nSupply contract unpaid. Summons served 18 Aug 2026. WS clock running.",
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}

describe("intakeFromMatter", () => {
  it("maps Indian courts, sides and proceedings onto research intake fields", () => {
    assert.equal(mapCourtId("Delhi High Court (Commercial)"), "delhi");
    assert.equal(mapCourtId("Sessions Court, Jaipur"), "rajasthan");
    assert.equal(mapCourtId("Rajasthan High Court, Jaipur Bench"), "rajasthan");
    assert.equal(mapCourtId("Supreme Court of India"), "sc");
    assert.equal(mapCourtId("NCDRC, New Delhi"), "ncdrc");
    assert.equal(mapCourtId("Securities Appellate Tribunal"), "sat");
    assert.equal(mapCourtId("DRT Jaipur"), "drt");
    assert.equal(mapCourtId("National Green Tribunal, Principal Bench"), "ngt");
    assert.equal(mapPracticeArea("criminal"), "criminal");
    assert.equal(mapPracticeArea("writ"), "writ");
    assert.equal(mapPracticeArea("commercial"), "civil");
    assert.equal(mapSide("accused"), "respondent");
    assert.equal(mapSide("appellant"), "petitioner");
  });

  it("prefills every research field from a matter bundle", () => {
    const bundle: Pick<MatterBundle, "matter" | "hearings" | "tasks" | "deadlines"> = {
      matter: matter(),
      hearings: [
        {
          id: "hr_1",
          matterId: "mt_1",
          listedOn: "2026-09-01",
          listedAt: "14:30",
          courtRoom: "",
          bench: "",
          purpose: "First hearing after service",
          stage: "ws_pending",
          outcome: "",
          nextDate: null,
          notes: "",
          createdAt: "",
        },
      ],
      tasks: [
        {
          id: "tk_1",
          matterId: "mt_1",
          title: "Chase WS / 7 / 11 from defendant",
          origin: "lawyer",
          status: "open",
          dueOn: "2026-08-31",
          sourceQuote: "",
          createdAt: "",
        },
      ],
      deadlines: [
        {
          id: "dl_1",
          matterId: "mt_1",
          title: "Commercial WS 120-day outer limit",
          dueOn: "2026-12-16",
          origin: "statute",
          sourceQuote: "",
          status: "open",
          createdAt: "",
        },
      ],
    };
    const intake = intakeFromMatter(bundle, "en");
    assert.equal(intake.courtId, "delhi");
    assert.equal(intake.area, "civil");
    assert.equal(intake.side, "petitioner");
    assert.equal(intake.lang, "en");
    assert.match(intake.facts, /Sharma v Apex/);
    assert.match(intake.facts, /CS \(COMM\) 412\/2026/);
    assert.match(intake.facts, /DLHC01-012345-2026/);
    assert.match(intake.facts, /Plaintiff: Vikram Sharma/);
    assert.match(intake.facts, /WS clock running/);
    assert.match(intake.facts, /Commercial WS 120-day/);
    assert.match(intake.facts, /Chase WS/);
    assert.match(intake.query, /120-day commercial WS/);
    assert.ok(intake.facts.length >= 40);
  });
});
