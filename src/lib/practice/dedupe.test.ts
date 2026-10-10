import assert from "node:assert/strict";
import test from "node:test";
import {
  findDuplicateDocument,
  findDuplicateHearing,
  findDuplicateOrder,
  findDuplicateTask,
} from "./dedupe.ts";
import { isStageReverse, wouldMoveReverse } from "./stage-direction.ts";

test("documents and orders match on the same text", () => {
  const docs = [{ id: "d1", title: "Order", body: "Stay till Monday.", contentHash: "", externalId: "" }];
  assert.equal(findDuplicateDocument({ title: "Other", body: "Stay till Monday." }, docs)?.id, "d1");
  assert.equal(findDuplicateDocument({ title: "New", body: "Different text." }, docs), undefined);
  const orders = [{ id: "o1", body: "Stay till Monday.", orderDate: "2026-03-01", documentId: "d1" }];
  assert.equal(findDuplicateOrder({ body: "Stay till Monday.", documentId: "other" }, orders)?.id, "o1");
});

test("tasks and hearings skip a repeat and allow a dismissed task again", () => {
  assert.equal(findDuplicateTask("File reply", [{ title: "file   reply", status: "open" }])?.title, "file   reply");
  assert.equal(findDuplicateTask("File reply", [{ title: "File reply", status: "dismissed" }]), undefined);
  assert.ok(findDuplicateHearing("2026-04-01", "Arguments", [{ listedOn: "2026-04-01", purpose: "arguments" }]));
  assert.equal(findDuplicateHearing("2026-04-02", "Arguments", [{ listedOn: "2026-04-01", purpose: "arguments" }]), undefined);
});

test("an earlier stage or an older order that would move stage asks before applying", () => {
  assert.equal(isStageReverse("civil", "arguments", "notice"), true);
  assert.equal(isStageReverse("civil", "notice", "draft_plaint"), false);
  assert.equal(
    wouldMoveReverse({
      proceeding: "civil",
      currentStage: "arguments",
      proposedStage: "notice",
      orderDate: "2026-01-01",
      latestDate: "2026-04-01",
    }),
    true,
  );
  assert.equal(
    wouldMoveReverse({
      proceeding: "civil",
      currentStage: "notice",
      proposedStage: "draft_plaint",
      orderDate: "2026-01-01",
      latestDate: "2026-04-01",
    }),
    true,
  );
  assert.equal(
    wouldMoveReverse({
      proceeding: "civil",
      currentStage: "notice",
      proposedStage: null,
      orderDate: "2026-01-01",
      latestDate: "2026-04-01",
    }),
    false,
  );
});
