/** Mock Partner API payloads. Never hit webapi.ecourtsindia.com from tests. */

export const FIXTURE_CNR = "RJJP010000012025";

const NOTICE_BODY = `IN THE COURT OF THE DISTRICT AND SESSIONS JUDGE, JAIPUR METRO
Civil Suit 12/2025
Sharma v Verma
CNR: RJJP010000012025
Order dated 10.02.2025

Counsel for the plaintiff present. Issue notice to the defendant through ordinary process and speed post. Written statement is directed to be filed within 30 days. Process fee be filed within 7 days.
Next Date of Hearing: 12-03-2025.`;

export const PARTNER_CASE_FIXTURE = {
  data: {
    courtCaseData: {
      cnr: FIXTURE_CNR,
      caseType: "CS",
      caseTypeRaw: "Civil Suit",
      caseStatus: "PENDING",
      filingDate: "2025-01-15",
      registrationNumber: "12/2025",
      courtName: "District and Sessions Judge, Jaipur Metro",
      district: "Jaipur",
      state: "RJ",
      petitioners: ["SHARMA"],
      respondents: ["VERMA"],
      nextHearingDate: "2025-10-01",
      hasOrders: true,
      orderCount: 2,
    },
    historyOfCaseHearings: [
      {
        businessOnDate: "2025-02-10",
        hearingDate: "2025-03-12",
        purposeOfListing: "Written statement",
        judge: "Shri A. Mehta",
      },
    ],
    interimOrders: [
      {
        orderDate: "2025-02-10",
        description: "Notice issued to the defendant.",
        orderUrl: "order-1.pdf",
      },
      {
        orderDate: "2025-03-12",
        description: "WS",
        orderUrl: "order-2.pdf",
      },
    ],
    judgmentOrders: [],
    files: {
      files: [
        {
          pdfFile: `${FIXTURE_CNR}-order-1.pdf`,
          markdownFile: `${FIXTURE_CNR}-order-1.md`,
          markdownContent: NOTICE_BODY,
        },
      ],
    },
  },
  meta: { request_id: "req_fixture_jaipur_1" },
};

export const PARTNER_HEARINGS_ONLY_FIXTURE = {
  data: {
    courtCaseData: {
      cnr: FIXTURE_CNR,
      caseStatus: "PENDING",
      courtName: "District and Sessions Judge, Jaipur Metro",
      petitioners: ["SHARMA"],
      respondents: ["VERMA"],
    },
    historyOfCaseHearings: [
      {
        businessOnDate: "2025-02-10",
        hearingDate: "2025-03-12",
        purposeOfListing: "Written statement",
        judge: "Shri A. Mehta",
      },
    ],
    interimOrders: [],
    judgmentOrders: [],
    files: { files: [] },
  },
  meta: { request_id: "req_fixture_empty" },
};

export const PARTNER_NESTED_ORDERS_FIXTURE = {
  data: {
    courtCaseData: {
      cnr: "DLHC010001992024",
      caseTitle: "Verma v GNCTD",
      caseType: "W.P.(C)",
      caseStatus: "PENDING",
      courtName: "Delhi High Court",
      registrationNumber: "3312/2025",
      interimOrders: [
        {
          orderDate: "2025-04-01",
          description: "Notice. Counter affidavit within four weeks. Rejoinder thereafter. List on 12.05.2025.",
          orderUrl: "order-1.pdf",
        },
      ],
      judgmentOrders: [],
    },
    files: { files: [] },
  },
  meta: { request_id: "req_fixture_nested" },
};

/** Live docs shape: files is a flat array; descriptions are stubs like COPY OF ORDER. */
export const PARTNER_FLAT_FILES_FIXTURE = {
  data: {
    courtCaseData: {
      cnr: "DLND020047882015",
      caseTitle: "State v Accused",
      courtName: "Chief Metropolitan Magistrate, New Delhi, PHC",
      caseStatus: "DISPOSED",
      interimOrders: [
        { orderDate: "2017-10-27", description: "COPY OF ORDER", orderUrl: "order-1.pdf" },
      ],
      judgmentOrders: [],
      files: [
        {
          pdfFile: "DLND020047882015-order-1.pdf",
          markdownFile: "DLND020047882015-order-1.md",
          markdownContent: NOTICE_BODY,
        },
      ],
    },
  },
  meta: { request_id: "req_fixture_flat_files" },
};

/** Live Delhi HC shape: View ORDER stubs, empty files.files. */
export const PARTNER_DLHC_VIEW_ORDER_FIXTURE = {
  data: {
    courtCaseData: {
      cnr: "DLHC010097752026",
      courtName: "DLHC",
      caseType: "WP_C",
      caseTypeRaw: "W.P.(C)",
      caseStatus: "PENDING",
      registrationNumber: "3418/2026",
      petitioners: ["Spherion Solutions Private Limited"],
      respondents: ["Additional Commissioner Adjudication Cgst Delhi North", "Ors."],
      hasOrders: true,
      orderCount: 2,
      interimOrders: [
        { orderDate: "2026-03-17", description: "View ORDER", orderUrl: "order-1.pdf" },
        { orderDate: "2026-03-23", description: "View ORDER", orderUrl: "order-2.pdf" },
      ],
      judgmentOrders: [],
    },
    files: { files: [] },
  },
  meta: { request_id: "4000dfb8-0011-9c00-b63f-84710c7967bb" },
};

