export const departmentBudgetLevels = [
  {
    id: 0,
    label: "Standby",
    multiplier: 0,
    description: "Keep a skeleton crew available for urgent escalations only.",
  },
  {
    id: 1,
    label: "Baseline",
    multiplier: 1,
    description: "Fund normal operating hours with standard staffing and supplies.",
  },
  {
    id: 2,
    label: "Focused",
    multiplier: 1.35,
    description: "Add overtime coverage and consumables to speed up throughput.",
  },
  {
    id: 3,
    label: "Surge",
    multiplier: 1.75,
    description: "Maximise staffing, diagnostics, and logistics for peak demand days.",
  },
];

export const departmentCatalog = [
  {
    id: "marketing",
    name: "Marketing Department",
    category: "Business Operations",
    description:
      "Runs advertising, outreach, and brand partnerships to keep patient demand high.",
    baseCost: 1200,
    defaultBudget: 1,
    roles: ["marketer"],
    rooms: [],
    metrics: [
      { id: "campaigns", type: "campaigns", label: "Active Campaigns" },
      { id: "staff", type: "staff", label: "Marketers" },
    ],
  },
  {
    id: "debt",
    name: "Debt & Receivables",
    category: "Finance",
    description:
      "Monitors patient payment plans, follows up on overdue balances, and keeps cashflow stable.",
    baseCost: 1000,
    defaultBudget: 1,
    roles: ["accountant"],
    rooms: ["billing"],
    metrics: [
      { id: "plans", type: "installments", label: "Payment Plans" },
      { id: "balance", type: "receivablesBalance", label: "Outstanding" },
      { id: "staff", type: "staff", label: "Accounts Staff" },
    ],
  },
  {
    id: "emergency",
    name: "Emergency Medicine",
    category: "Clinical Care",
    description:
      "Stabilises ambulance arrivals, critical care patients, and coordinates with the ICU.",
    baseCost: 2100,
    defaultBudget: 2,
    roles: ["doctor", "nurse", "surgeon"],
    rooms: ["emergency", "icu"],
    metrics: [
      { id: "rooms", type: "rooms", label: "Critical Rooms" },
      { id: "staff", type: "staff", label: "Clinical Staff" },
      { id: "queue", type: "queue", label: "Emergency Queue" },
    ],
  },
  {
    id: "radiology",
    name: "Radiology & Diagnostics",
    category: "Clinical Care",
    description:
      "Operates imaging suites and advanced diagnostics to keep treatment pipelines accurate.",
    baseCost: 1600,
    defaultBudget: 1,
    roles: ["technician", "doctor"],
    rooms: ["radiology", "diagnostics", "cardiology", "neurology"],
    metrics: [
      { id: "rooms", type: "rooms", label: "Diagnostic Rooms" },
      { id: "staff", type: "staff", label: "Technologists" },
    ],
  },
  {
    id: "surgery",
    name: "Surgical Services",
    category: "Clinical Care",
    description:
      "Schedules operating theatres, coordinates surgical teams, and manages sterilisation workflow.",
    baseCost: 2500,
    defaultBudget: 2,
    roles: ["surgeon", "nurse", "technician"],
    rooms: ["surgery", "burn", "oncology"],
    metrics: [
      { id: "rooms", type: "rooms", label: "Theatres Online" },
      { id: "staff", type: "staff", label: "Surgeons" },
    ],
  },
  {
    id: "wellness",
    name: "Family & Wellness",
    category: "Guest Services",
    description:
      "Handles maternity, pediatrics, nutrition, and comfort spaces that keep families cared for.",
    baseCost: 1300,
    defaultBudget: 1,
    roles: ["midwife", "therapist", "chef", "entertainer"],
    rooms: ["pediatrics", "maternity", "cafeteria", "gourmet", "zen", "holotheatre"],
    metrics: [
      { id: "rooms", type: "rooms", label: "Suites Ready" },
      { id: "staff", type: "staff", label: "Support Staff" },
    ],
  },
];
