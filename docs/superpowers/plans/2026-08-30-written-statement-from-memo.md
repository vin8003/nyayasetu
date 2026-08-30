# Written Statement from Memo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draft a first-cut written statement (लिखित कथन) from the current intake and verified memo, on the same authenticated no-`web_search` `draftLetter` path as Notice, Reply, and Petition.

**Architecture:** Add `"writtenStatement"` to `LETTER_KINDS`. Reuse `draftLetter`, `parseLetterDraft`, cite re-stamp, unverified scrub, `letterChrome`, and `LetterView`. Map CPC Order VIII shape onto existing `LegalLetter` fields: facts = additional facts, grounds = para-wise reply, `timeOrStand` = preliminary objections, `closing` = prayer, `verification` kept (same as petition). First feed forum, cause title, and memo statutes into `buildLetterUser` so the pleading names the court and the sections the memo already found. No new xAI path. No DB persist. No Indian Kanoon HTML fetch.

**Tech Stack:** TypeScript, Node test runner (`node --experimental-strip-types --test`), TanStack Start `createServerFn`, existing xAI Responses JSON object (no `tools` key), Lucide icons, `src/lib/research/copy.ts` hi+en keys.

## Global Constraints

- Letter/WS xAI body must not include `tools` or `web_search` (research in `src/lib/research/run.ts` remains the only search client).
- Do not GET Indian Kanoon (or any judgment) HTML to “verify” a cite.
- A ground is kept only if it matches a precedent re-stamped against `citationUrls` on an allowlisted `http(s)` host, or if it has no cite. Invented names/cites/URLs are stripped from prose.
- Draft language is the **memo** language (`startDraft` already passes `intake: { ...intake, lang: memoLang }`).
- v1 does **not** persist the written statement (memos table stays memo-only).
- `draftLetter` stays behind `authMiddleware`. Ground URLs on screen go through `httpHref`.
- Every new `copy` key is added to both `copy.hi` and `copy.en`.
- `letterChrome` and `kindLine` stay `Record<LetterKind, …>` so a new kind fails typecheck until both maps are updated.
- Verification is kept when `letterChrome(kind).verificationHeading` is non-empty (petition and written statement); notice and reply still force `verification` to `""`.
- Test command: `npx tsc --noEmit` and `node --experimental-strip-types --test src/lib/research/*.test.ts src/lib/app-data/app-data.test.ts src/lib/auth/gate-identity.test.ts`.
- Branch from current `main`: `feature/written-statement-from-memo-62f4`.
- Out of this plan (separate later plans): persist drafts, vakalatnama, follow-up Q&A, scanned-PDF OCR, chambers, BNS map, a second model call.

**Pulled baseline (2026-08-30):** `origin/main` at `e21fd29` includes merged PRs #3 and #4 plus Google/X host fixes. `LETTER_KINDS` is `["notice", "reply", "petition"]`. `buildLetterUser` still omits `courtById`, `memo.causeTitle`, and `memo.statutes`. Image OCR already exists in `src/lib/research/files.ts`; text PDFs use `unpdf`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/research/types.ts` | Add `"writtenStatement"` to `LETTER_KINDS`. |
| `src/lib/research/copy.ts` | Button, kicker, preliminary-objections heading (hi+en). |
| `src/lib/research/letter-prompt.ts` | Forum / cause title / statutes in the user message; WS kind-line; system JSON field meanings. |
| `src/lib/research/letter-prompt.test.ts` | Context lines; WS shape; notice/reply/petition still distinct. |
| `src/lib/research/letter-format.ts` | `letterChrome.writtenStatement`; assemble keeps verification when chrome says so. |
| `src/lib/research/letter-format.test.ts` | WS EN/HI labels, verified cite, no Invented Case, no Without prejudice / Time to comply. |
| `src/lib/research/letter.ts` | No kind switch — already `z.enum(LETTER_KINDS)`. |
| `src/components/memo-view.tsx` | Written statement button calling `onDraft("writtenStatement")`. |
| `src/components/letter-view.tsx` | No kind `if`s — already driven by `letterChrome`. |
| `src/routes/index.tsx` | No change — `startDraft(kind: LetterKind)` already generic. |

---

### Task 1: Put forum, cause title, and memo statutes in the letter user message

**Files:**
- Modify: `src/lib/research/letter-prompt.ts`
- Test: `src/lib/research/letter-prompt.test.ts`
- Read: `src/lib/research/courts.ts` (`courtById`)

**Interfaces:**
- Consumes: `buildLetterUser({ kind, intake, memo })`; `Intake.courtId`; `LegalMemo.causeTitle`; `LegalMemo.statutes`.
- Produces: user string that includes forum name, cause title, and statute name+sections for every kind (notice/reply/petition/later WS). Still no `tools` key.

- [ ] **Step 1: Write the failing test**

In `src/lib/research/letter-prompt.test.ts`, give the shared `memo` a statute (the fixture currently has `statutes: []`) and add this test inside `describe("buildLetterUser"`:

```ts
  it("includes forum, cause title, and memo statutes in the user message", () => {
    const user = buildLetterUser({
      kind: "petition",
      intake,
      memo: {
        ...memo,
        causeTitle: "Vivek v. State (Rajasthan HC)",
        statutes: [
          { name: "BNSS", sections: "482", why: "Anticipatory bail.", url: "" },
        ],
      },
    });
    assert.match(user, /Rajasthan High Court/);
    assert.match(user, /Vivek v\. State \(Rajasthan HC\)/);
    assert.match(user, /BNSS/);
    assert.match(user, /482/);
    assert.doesNotMatch(user, /web_search/);
  });
```

Leave `intake.courtId` as `"rajasthan"` (already set on `intake`).

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --experimental-strip-types --test src/lib/research/letter-prompt.test.ts
```

Expected: FAIL — input does not match `/Rajasthan High Court/` (user message currently has `Forum / side: petitioner. Practice area: criminal.` only).

- [ ] **Step 3: Write minimal implementation**

At the top of `src/lib/research/letter-prompt.ts` add:

```ts
import { courtById } from "./courts.ts";
```

Inside `buildLetterUser`, after the `kindLine` map and before the `return [`, compute:

```ts
  const court = courtById(intake.courtId);
  const statuteLines =
    memo.statutes
      .map((row) => `- ${row.name} ${row.sections}: ${row.why}`.trim())
      .join("\n") || "(none)";
```

Insert these lines in the returned array immediately after `kindLine[kind]`:

```ts
    `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Side: ${intake.side}. Practice area: ${intake.area}.`,
    `Cause title: ${memo.causeTitle.trim() || "(none)"}`,
```

Remove the old line:

```ts
    `Forum / side: ${intake.side}. Practice area: ${intake.area}.`,
```

After `Memo title: ${memo.title}` add:

```ts
    `Statutes from the memo (names and sections only; not extra cases):\n${statuteLines}`,
```

Do not add statute URLs. Do not add `tools` to `letterXaiBody`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --experimental-strip-types --test src/lib/research/letter-prompt.test.ts
npx tsc --noEmit
```

Expected: all prompt tests PASS; `tsc` clean. Existing reply/petition kind-line tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/letter-prompt.ts src/lib/research/letter-prompt.test.ts
git commit -m "feat: pass forum, cause title, and statutes into letter drafts"
```

---

### Task 2: Written-statement kind, copy, and chrome

**Files:**
- Modify: `src/lib/research/types.ts`
- Modify: `src/lib/research/copy.ts`
- Modify: `src/lib/research/letter-format.ts`
- Test: `src/lib/research/letter-format.test.ts`

**Interfaces:**
- Consumes: `LetterKind`; `letterChrome(kind, c)`; `assembleLetter`.
- Produces: `LETTER_KINDS` includes `"writtenStatement"`. `letterChrome("writtenStatement", c)` returns kicker + para-wise grounds + prayer + preliminary objections + verification heading. `assembleLetter` keeps `verification` when `chrome.verificationHeading` is non-empty.

- [ ] **Step 1: Write the failing tests**

In `src/lib/research/letter-format.test.ts`, add imports if missing (`letterChrome` is already imported). Append:

```ts
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
```

These must fail to compile or fail at runtime until `writtenStatement` exists on `LetterKind` and the copy keys exist.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npx tsc --noEmit
```

Expected: FAIL — `Type '"writtenStatement"' is not assignable to type 'LetterKind'`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/research/types.ts` replace:

```ts
export const LETTER_KINDS = ["notice", "reply", "petition"] as const;
```

with:

```ts
export const LETTER_KINDS = ["notice", "reply", "petition", "writtenStatement"] as const;
```

In `src/lib/research/copy.ts` add keys **immediately after** `draftPetition` / `letterPetitionKicker` in **both** `hi` and `en` (same insertion point so the two objects stay aligned):

Hindi:

```ts
    draftWrittenStatement: "लिखित कथन",
```

```ts
    letterWsKicker: "लिखित कथन",
```

```ts
    letterPrelim: "प्रारंभिक आपत्तियाँ",
```

English:

```ts
    draftWrittenStatement: "Written statement",
```

```ts
    letterWsKicker: "written statement",
```

```ts
    letterPrelim: "Preliminary objections",
```

In `src/lib/research/letter-format.ts`, add the chrome row (TypeScript will error on `Record<LetterKind, LetterChrome>` until this exists):

```ts
    writtenStatement: {
      kicker: c.letterWsKicker,
      withoutPrejudice: false,
      groundsHeading: c.letterParaReply,
      closingHeading: c.letterPrayer,
      followOnHeading: c.letterPrelim,
      verificationHeading: c.letterVerification,
    },
```

Change `assembleLetter` verification from `opts.kind === "petition" ? … : ""` to chrome-driven:

```ts
  const chrome = letterChrome(opts.kind, t(opts.lang));
  return {
    kind: opts.kind,
    lang: opts.lang,
    heading: scrub(opts.draft.heading),
    parties: scrub(opts.draft.parties),
    facts: scrub(opts.draft.facts),
    grounds,
    closing: scrub(opts.draft.closing),
    timeOrStand: scrub(opts.draft.timeOrStand),
    verification: chrome.verificationHeading ? scrub(opts.draft.verification ?? "") : "",
    risks: scrub(opts.draft.risks),
  };
```

`t` is already imported from `./copy.ts`.

`formatLegalLetter` already uses `chrome.verificationHeading` and does not need a kind `if`.

In `letter-prompt.ts`, add a `kindLine.writtenStatement` string **now** so `tsc` does not fail `Record<LetterKind, string>` after Task 2 (the WS-specific prompt tests are Task 3). Use:

```ts
    writtenStatement:
      "Kind: written statement for filing. Write a respondent or defendant pleading: parties, additional facts, numbered para-wise reply grounds, optional preliminary objections, a prayer to dismiss or contest, and a short verification clause. Do not write a legal notice, a without-prejudice notice-reply, or a petitioner prayer for primary relief.",
```

That sentence must **not** contain the substring `time to comply`.

Also extend notice/reply/petition kind-lines with `or a written statement` in the do-not list so the model does not emit a WS when those kinds are selected. Example notice line:

```ts
    notice:
      "Kind: legal notice. Write a demand and a time to comply. Do not use a without-prejudice reply shape, a court petition prayer, a written statement, or a verification clause.",
```

Reply line (must still contain `time to comply` as a prohibition, for the existing reply test):

```ts
    reply:
      "Kind: reply to notice. Write a without prejudice, para-wise reply and the stand taken. Do not write a demand, a time to comply, a petition prayer, a written statement, or a verification clause.",
```

Petition line (must still **not** contain `time to comply`):

```ts
    petition:
      "Kind: court petition. Write a petition for filing: parties, facts, numbered grounds, prayer, optional interim relief, and a short verification clause. Do not write a legal notice, a without-prejudice reply, or a written statement.",
```

Update `LETTER_SYSTEM` JSON comments:

```text
  "closing": "notice: the demand. reply: covering para-wise denial. petition: the petitioner prayer. writtenStatement: the prayer to dismiss or contest",
  "timeOrStand": "notice: time to comply. reply: the stand taken. petition: interim relief, or empty. writtenStatement: preliminary objections, or empty",
  "verification": "petition or writtenStatement: short verification clause. notice/reply: empty",
```

First line of `LETTER_SYSTEM`: `notice, reply, court petition, or written statement`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npx tsc --noEmit
node --experimental-strip-types --test src/lib/research/letter-format.test.ts src/lib/research/letter-prompt.test.ts
```

Expected: PASS. Petition tests still keep verification. Notice/reply tests still drop verification (`verificationHeading` empty). WS shows Prayer, Preliminary objections, Verification, Para-wise reply; no Without prejudice; Invented Case ground still dropped by existing `filterLetterGrounds`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/types.ts src/lib/research/copy.ts src/lib/research/letter-format.ts src/lib/research/letter-format.test.ts src/lib/research/letter-prompt.ts
git commit -m "feat: add written-statement kind with prayer, objections, and verification"
```

---

### Task 3: Written-statement user prompt tests

**Files:**
- Modify: `src/lib/research/letter-prompt.test.ts`
- Modify: `src/lib/research/letter-prompt.ts` (only if a test fails)

**Interfaces:**
- Consumes: `buildLetterUser({ kind: "writtenStatement", intake, memo })`.
- Produces: user message that asks for written statement / verification / preliminary / para-wise, lists only verified authorities, and does not contain `time to comply`.

- [ ] **Step 1: Write the failing test**

In `src/lib/research/letter-prompt.test.ts` `describe("buildLetterUser"` add:

```ts
  it("asks for a written statement shape when kind is writtenStatement, without a notice demand", () => {
    const user = buildLetterUser({
      kind: "writtenStatement",
      intake: { ...intake, side: "respondent" },
      memo,
    });
    assert.match(user, /written statement|लिखित कथन/i);
    assert.match(user, /preliminary|verification|para-wise|prayer/i);
    assert.doesNotMatch(user, /time to comply/i);
    assert.match(user, /Arnesh Kumar/);
    assert.doesNotMatch(user, /Invented Case/);
    assert.match(user, /respondent/);
  });
```

If Task 2 already wrote the kind-line, this test may pass immediately. If it passes, that is acceptable only after you confirm it would have failed on `main` before Task 2 (kind not in the union). If it fails because the kind-line is too thin, tighten the kind-line — do not weaken the test.

- [ ] **Step 2: Run test to verify it fails (or confirm it already covers Task 2)**

Run:

```bash
node --experimental-strip-types --test src/lib/research/letter-prompt.test.ts
```

Expected: PASS if Task 2 kind-line is complete; otherwise FAIL on `/written statement|लिखित कथन/i`.

- [ ] **Step 3: Write minimal implementation**

Only if Step 2 failed. Expand `kindLine.writtenStatement` until the assertions pass, without putting `time to comply` in that string.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --experimental-strip-types --test src/lib/research/letter-prompt.test.ts
```

Expected: PASS, including the existing petition `doesNotMatch(/time to comply/i)` and reply `match(/time to comply/i)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research/letter-prompt.test.ts src/lib/research/letter-prompt.ts
git commit -m "test: lock written-statement prompt shape and cite list"
```

If there is no diff, skip the commit and record that Task 2 already satisfied the assertions.

---

### Task 4: MemoView button

**Files:**
- Modify: `src/components/memo-view.tsx`
- Test: `npx tsc --noEmit` (no component test runner in this repo)

**Interfaces:**
- Consumes: `onDraft: (kind: LetterKind) => void`; `c.draftWrittenStatement`.
- Produces: a fourth draft control that calls `onDraft("writtenStatement")`. `index.tsx` `startDraft` already forwards `kind` to `draftLetter`.

- [ ] **Step 1: Write the failing check**

There is no React test file. The failing signal is: `c.draftWrittenStatement` is unused and the memo toolbar has no WS control. Add a tiny type-level usage by implementing the button (Step 3) only after confirming `draftWrittenStatement` exists from Task 2.

Optional smoke: from repo root, `rg "onDraft\\(\"writtenStatement\"\\)" src/components/memo-view.tsx` returns no matches **before** Step 3.

- [ ] **Step 2: Run to verify the gap**

Run:

```bash
rg 'onDraft\("writtenStatement"\)' src/components/memo-view.tsx
```

Expected: no matches.

- [ ] **Step 3: Write minimal implementation**

In `src/components/memo-view.tsx` lucide import, add `FileText`:

```ts
import { ArrowLeft, Copy, Printer, Bookmark, FileDown, Scale, MessageSquare, ScrollText, FileText } from "lucide-react";
```

Immediately after the Petition button, add:

```tsx
          <Button variant="outline" size="sm" onClick={() => onDraft("writtenStatement")}>
            <FileText className="size-3.5" />
            {c.draftWrittenStatement}
          </Button>
```

Do not add a new view in `index.tsx`. Do not persist. Buttons already `flex-wrap`.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npx tsc --noEmit
node --experimental-strip-types --test src/lib/research/*.test.ts src/lib/app-data/app-data.test.ts src/lib/auth/gate-identity.test.ts
```

Expected: `tsc` clean; all listed tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/memo-view.tsx
git commit -m "feat: draft a written statement from the memo toolbar"
```

---

### Task 5: Full gate and PR

**Files:**
- None unless a test or type error remains.

**Interfaces:**
- Consumes: Tasks 1–4 on `feature/written-statement-from-memo-62f4`.
- Produces: PR against `main`.

- [ ] **Step 1: Confirm kinds are exhaustive**

Grep:

```bash
rg "kind === \"petition\"" src/lib/research src/components
rg "LETTER_KINDS" src/lib/research/types.ts
```

Expected: assemble/format/LetterView do not special-case petition for verification (chrome does). `LETTER_KINDS` lists four kinds.

- [ ] **Step 2: Run the full unit command**

```bash
npx tsc --noEmit
node --experimental-strip-types --test src/lib/research/*.test.ts src/lib/app-data/app-data.test.ts src/lib/auth/gate-identity.test.ts
```

Expected: 0 `tsc` errors; 0 failed tests. Do not “fix” pre-existing `scripts/` fixture failures (missing `.grok` skills).

- [ ] **Step 3: Browser check (when a browser is available)**

Log in, open a past memo, confirm **Written statement** / **लिखित कथन** next to Petition. Click it. With no `XAI_API_KEY`, expect the existing AI-unavailable toast. Do not treat a live Grok body as required in this environment.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feature/written-statement-from-memo-62f4
```

PR title: `Draft a written statement from the research memo`

PR body must state: same `draftLetter` path, no `web_search`, para-wise + preliminary objections + prayer + verification, cite re-stamp, v1 no persist, stacked on current `main`.

- [ ] **Step 5: Commit**

No extra commit unless Step 1–2 required a fix. If a fix was needed:

```bash
git add -u
git commit -m "fix: keep written-statement chrome exhaustive after review"
```

---

## Later plans (not this PR)

These are independent subsystems. Do not fold them into this implementation:

1. **Persist drafts** — new `letters` (or `drafts`) table keyed by `user_id` + memo id; Past memos opens the last notice/reply/petition/WS.
2. **Vakalatnama** — mostly a filled form, weak fit for the research memo; separate template, not `draftLetter`.
3. **Follow-up Q&A** — second xAI path against the memo, still no `web_search` if it is “ask the memo”.
4. **Scanned-PDF OCR** — `unpdf` misses image-only PDFs; rasterize then reuse `ocrImage` in `files.ts`.
5. **Application / stay** — another `LETTER_KIND` after WS ships.

---

## Spec coverage (self-review)

| Requirement | Task |
|---|---|
| No `web_search` on draft | Task 1 test + existing `letterXaiBody` test |
| Forum + cause title + statutes in prompt | Task 1 |
| WS kind on same `draftLetter` | Tasks 2–4 |
| Para-wise, prelim objections, prayer, verification | Task 2 chrome + format tests |
| Cite re-stamp / Invented Case out | Task 2 reuses `filterLetterGrounds` / scrub |
| Notice/reply still drop verification | Task 2 chrome-driven assemble |
| Memo language | existing `startDraft` |
| Button EN/HI | Task 2 copy + Task 4 |
| No persist / no IK HTML / no vakalatnama | Global constraints + later-plans section |
| Exhaustive `LetterKind` maps | Task 2 `Record<LetterKind, …>` |
