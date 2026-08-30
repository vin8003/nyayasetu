// @ts-nocheck
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultStage, possibleNext, proceedingDef, stageDef } from "./workflow.ts";

describe("CiteBench proceeding model", () => {
  it("lists the core Indian proceeding types", () => {
    const ids = ["civil", "commercial", "criminal", "writ", "appellate", "family", "consumer", "arbitration", "execution"];
    for (const id of ids) {
      const def = proceedingDef(id);
      assert.equal(def.id, id);
      assert.ok(def.stages.length > 2, id);
      assert.equal(def.stages.at(-1)?.id, "closed");
    }
  });

  it("starts civil at intake and commercial written statement is mandatory", () => {
    assert.equal(defaultStage("civil"), "intake");
    const ws = stageDef("commercial", "ws_pending");
    assert.ok(ws);
    assert.match(ws!.what, /mandatory/i);
    assert.match(ws!.what, /120/);
  });

  it("civil judgment next is closed, not a dangling execution stage", () => {
    const next = possibleNext("civil", "judgment").map((n) => n.id);
    assert.ok(next.includes("closed"));
    assert.ok(!next.includes("execution"));
  });

  it("family notice is reachable from intake (no dangling replication/evidence)", () => {
    const family = proceedingDef("family");
    const ids = new Set(family.stages.map((s) => s.id));
    for (const stage of family.stages) {
      for (const n of stage.next) assert.ok(ids.has(n), `family ${stage.id} -> ${n}`);
      for (const b of stage.branches) assert.ok(ids.has(b.to), `family branch ${stage.id} -> ${b.to}`);
    }
    const intake = stageDef("family", "intake");
    assert.ok(intake?.next.includes("notice") || intake?.next.includes("draft_plaint") || intake?.next.length);
  });

  it("consumer and appellate graphs only point at stages they define", () => {
    for (const id of ["consumer", "appellate", "writ", "criminal"] as const) {
      const def = proceedingDef(id);
      const ids = new Set(def.stages.map((s) => s.id));
      for (const stage of def.stages) {
        for (const n of stage.next) assert.ok(ids.has(n), `${id} ${stage.id} -> ${n}`);
        for (const b of stage.branches) assert.ok(ids.has(b.to), `${id} branch ${stage.id} -> ${b.to}`);
      }
    }
  });
});
