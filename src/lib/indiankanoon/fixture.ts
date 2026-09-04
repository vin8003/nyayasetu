/** Live API responses from 2026-09-04. Tests only. Never hit the live host. */

export const IK_LIVE_CNR = "DLHC010097752026";
export const IK_LIVE_CNR_KAMRAN = "DLHC010223332023";

export const IK_SEARCH_FIXTURE = {
  categories: [
    [
      "Document Types",
      [
        { value: "All", formInput: "DLHC010097752026", selected: true },
        { value: "Laws", formInput: "DLHC010097752026+doctypes:laws" },
        { value: "Judgments", formInput: "DLHC010097752026+doctypes:judgments" },
        { value: "Tribunals", formInput: "DLHC010097752026+doctypes:tribunals" },
        {
          value: "Highcourts & Supremecourt",
          formInput: "DLHC010097752026+doctypes:supremecourt,scorders,highcourts",
        },
      ],
    ],
    [
      "Courts and Laws",
      [
        { value: "Delhi High Court", formInput: "DLHC010097752026+doctypes:delhi", selected: false },
        {
          value: "Delhi High Court - Orders",
          formInput: "DLHC010097752026+doctypes:delhiorders",
          selected: false,
        },
      ],
    ],
    ["Years", [{ value: "2026", formInput: "DLHC010097752026+year:2026" }]],
  ],
  docs: [
    {
      tid: 99098448,
      catids: null,
      doctype: 1002,
      publishdate: "2026-09-03",
      authorid: null,
      bench: null,
      title: "Spherion Solutions Private Limited vs Additional Commissioner Adjudication ... on 3 September, 2026",
      numcites: 11,
      numcitedby: 0,
      headline:
        "Judgment pronounced on:03.09.2026 Judgment uploaded on:03.09.2026 # CNR No. <b>DLHC010097752026</b> + W.P.(C) 3418/2026, CM APPL. 16397/2026 & CM APPL. 16398/2026",
      docsize: 41202,
      fragment: true,
      docsource: "Delhi High Court",
    },
    {
      tid: 106234790,
      catids: null,
      doctype: 1003,
      publishdate: "2026-08-17",
      authorid: null,
      bench: null,
      title: "Spherion Solutions Private Limited vs Additional Commissioner Adjudication ... on 17 August, 2026",
      numcites: 0,
      numcitedby: 0,
      headline:
        "HIGH COURT OF DELHI AT NEW DELHI # CNR No. <b>DLHC010097752026</b> + W.P.(C) 3418/2026, CM APPL. 16397/2026 & CM APPL. 16398/2026 SPHERION",
      docsize: 2688,
      fragment: true,
      docsource: "Delhi High Court - Orders",
    },
  ],
  found: "1 - 2 of 2",
  encodedformInput: "DLHC010097752026",
};

/** Truncated live /doc/99098448/ body from the same curl — enough to land, not invented. */
export const IK_DOC_FIXTURE = {
  tid: 99098448,
  publishdate: "2026-09-03",
  title: "Spherion Solutions Private Limited vs Additional Commissioner Adjudication ... on 3 September, 2026",
  doc: `<h2 class="doc_title">Spherion Solutions Private Limited vs Additional Commissioner Adjudication ... on 3 September, 2026</h2>
<pre id="pre_1">* IN THE HIGH COURT OF DELHI AT NEW DELHI
% Judgment reserved on: 17.08.2026
Judgment pronounced on:03.09.2026
Judgment uploaded on:03.09.2026
# CNR No. DLHC010097752026
+ W.P.(C) 3418/2026, CM APPL. 16397/2026 & CM APPL. 16398/2026
SPHERION SOLUTIONS PRIVATE LIMITED .....Petitioner
versus
ADDITIONAL COMMISSIONER ADJUDICATION CGST
DELHI NORTH & ORS. .....Respondents
CORAM:
HON&#x27;BLE MR. JUSTICE ANIL KSHETARPAL
HON&#x27;BLE MS. JUSTICE SHAIL JAIN
JUDGMENT
</pre>
<p data-structure="Issue" id="p_1">ANIL KSHETARPAL, J.:</p>
<blockquote id="blockquote_1">1. Through the present Writ Petition, the Petitioner seeks rectification of the summary order in FORM GST DRC-07 dated 09.12.2025, issued pursuant to Order-in-Original dated 25.11.2025.</blockquote>`,
};

export const IK_SEARCH_FIXTURE_KAMRAN = {
  categories: [
    [
      "Document Types",
      [
        { value: "All", formInput: "DLHC010223332023", selected: true },
        { value: "Judgments", formInput: "DLHC010223332023+doctypes:judgments" },
      ],
    ],
  ],
  docs: [
    {
      tid: 128126463,
      catids: null,
      doctype: 1002,
      publishdate: "2026-09-03",
      authorid: 677,
      bench: [677],
      title: "Kamran Ashraf Reshi vs National Investigation Agency on 3 September, 2026",
      numcites: 31,
      numcitedby: 0,
      headline:
        "DELHI AT NEW DELHI Reserved on: 25.08.2026 Pronounced on: 03.09.2026 # CNR No. <b>DLHC010223332023</b> + CRL.A. 453/2023 KAMRAN ASHRAF RESHI .....Appellant",
      docsize: 117101,
      fragment: true,
      docsource: "Delhi High Court",
      author: "N Chawla",
      authorEncoded: "n-chawla",
    },
    {
      tid: 154666654,
      catids: null,
      doctype: 1003,
      publishdate: "2026-08-25",
      authorid: 677,
      bench: [677],
      title: "Kamran Ashraf Reshi vs National Investigation Agency on 25 August, 2026",
      numcites: 0,
      numcitedby: 0,
      headline:
        "HIGH COURT OF DELHI AT NEW DELHI # CNR No. <b>DLHC010223332023</b> + CRL.A. 453/2023 KAMRAN ASHRAF RESHI .....Appellant",
      docsize: 3044,
      fragment: true,
      docsource: "Delhi High Court - Orders",
      author: "N Chawla",
      authorEncoded: "n-chawla",
    },
    {
      tid: 183191039,
      catids: null,
      doctype: 1003,
      publishdate: "2026-08-17",
      authorid: 677,
      bench: [677],
      title: "Kamran Ashraf Reshi vs National Investigation Agency on 17 August, 2026",
      numcites: 0,
      numcitedby: 0,
      headline:
        "HIGH COURT OF DELHI AT NEW DELHI # CNR No. <b>DLHC010223332023</b> + CRL.A. 453/2023 KAMRAN ASHRAF RESHI .....Appellant versus NATIONAL",
      docsize: 2975,
      fragment: true,
      docsource: "Delhi High Court - Orders",
      author: "N Chawla",
      authorEncoded: "n-chawla",
    },
    {
      tid: 169597730,
      catids: null,
      doctype: 1003,
      publishdate: "2026-08-21",
      authorid: 677,
      bench: [677],
      title: "Kamran Ashraf Reshi vs National Investigation Agency on 21 August, 2026",
      numcites: 0,
      numcitedby: 0,
      headline:
        "HIGH COURT OF DELHI AT NEW DELHI # CNR No. <b>DLHC010223332023</b> (10)+ CRL.A. 453/2023 # CNR No. DLHC010236102026 (11) CRL.A. 528/2026 KAMRAN ASHRAF",
      docsize: 2869,
      fragment: true,
      docsource: "Delhi High Court - Orders",
      author: "N Chawla",
      authorEncoded: "n-chawla",
    },
    {
      tid: 151126340,
      catids: null,
      doctype: 1003,
      publishdate: "2026-08-21",
      authorid: 677,
      bench: [677],
      title: "Kamran Ashraf Reshi vs National Investigation Agency on 21 August, 2026",
      numcites: 0,
      numcitedby: 0,
      headline:
        "HIGH COURT OF DELHI AT NEW DELHI # CNR No. <b>DLHC010223332023</b> (10) CRL.A. 453/2023",
      docsize: 2869,
      fragment: true,
      docsource: "Delhi High Court - Orders",
      author: "N Chawla",
      authorEncoded: "n-chawla",
    },
  ],
  found: "1 - 5 of 5",
  encodedformInput: "DLHC010223332023",
};
