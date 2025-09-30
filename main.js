const GRID_WIDTH = 12;
const GRID_HEIGHT = 8;
const STARTING_CASH = 150000;
const DAY_TICKS = 60;
const CANVAS_CELL = 56;
const AXIS_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const PROPERTY_PARCELS = [
  {
    id: "atrium",
    name: "Founders Atrium",
    cost: 0,
    description: "Starter plaza with enough space for a GP hub and diagnostics.",
    x: 0,
    y: 0,
    width: 6,
    height: 4,
  },
  {
    id: "research",
    name: "Innovation Lot",
    cost: 48000,
    description: "Unlocks the north labs and plenty of room for specialty clinics.",
    x: 6,
    y: 0,
    width: 6,
    height: 4,
  },
  {
    id: "gardens",
    name: "Wellness Gardens",
    cost: 36000,
    description: "Adds calming grounds for wards, psychiatry, and guest services.",
    x: 0,
    y: 4,
    width: 6,
    height: 4,
  },
  {
    id: "emergency",
    name: "Emergency Concourse",
    cost: 52000,
    description: "Extends the trauma wing for emergency, surgery, and imaging suites.",
    x: 6,
    y: 4,
    width: 6,
    height: 4,
  },
];

const ROOM_SIZE_LIBRARY = [
  {
    id: "compact",
    label: "Compact (1x1)",
    width: 1,
    height: 1,
    costMultiplier: 1,
    upkeepMultiplier: 1,
    severityBonus: 0,
    environmentBonus: 0.2,
    description: "Entry layout for a quick setup.",
  },
  {
    id: "standard",
    label: "Standard (2x1)",
    width: 2,
    height: 1,
    costMultiplier: 1.35,
    upkeepMultiplier: 1.2,
    severityBonus: 0.5,
    environmentBonus: 0.6,
    description: "Adds an extra bay for machines and visitors.",
  },
  {
    id: "deluxe",
    label: "Deluxe (2x2)",
    width: 2,
    height: 2,
    costMultiplier: 1.8,
    upkeepMultiplier: 1.35,
    severityBonus: 1,
    environmentBonus: 1,
    description: "Premium suite with ample space for advanced care.",
  },
];

const ROOM_INTERIOR_LIBRARY = [
  {
    id: "modern",
    label: "Modern Steel",
    cost: 1200,
    upkeep: 35,
    palette: {
      base: "#1f2937",
      mid: "#334155",
      accent: "#60a5fa",
      decor: "#93c5fd",
    },
    modifiers: { efficiency: 2, morale: 1 },
  },
  {
    id: "soothing",
    label: "Soothing Pastels",
    cost: 1500,
    upkeep: 30,
    palette: {
      base: "#fdf2f8",
      mid: "#fce7f3",
      accent: "#f472b6",
      decor: "#34d399",
    },
    modifiers: { welfare: 3, environment: 2 },
  },
  {
    id: "vibrant",
    label: "Vibrant Pop",
    cost: 1000,
    upkeep: 25,
    palette: {
      base: "#0f172a",
      mid: "#1e293b",
      accent: "#f97316",
      decor: "#facc15",
    },
    modifiers: { reputation: 2, morale: 2 },
  },
  {
    id: "nature",
    label: "Nature Retreat",
    cost: 1350,
    upkeep: 28,
    palette: {
      base: "#f1f5f9",
      mid: "#bbf7d0",
      accent: "#22c55e",
      decor: "#65a30d",
    },
    modifiers: { welfare: 2, morale: 1, environment: 3 },
  },
];

const ROOM_MACHINE_LIBRARY = [
  {
    id: "standard-kit",
    label: "Standard Treatment Kit",
    cost: 0,
    upkeep: 0,
    severityBoost: 0,
    welfareBoost: 0,
    description: "Baseline tools for routine care.",
    color: "#cbd5f5",
  },
  {
    id: "advanced-diagnostics",
    label: "Advanced Diagnostics Rig",
    cost: 4200,
    upkeep: 80,
    severityBoost: 1,
    welfareBoost: 0.5,
    description: "High-resolution scanners for tricky ailments.",
    color: "#38bdf8",
  },
  {
    id: "precision-suite",
    label: "Precision Therapy Suite",
    cost: 7600,
    upkeep: 120,
    severityBoost: 2,
    welfareBoost: 1,
    description: "Specialist pods that unlock elite treatments.",
    color: "#f97316",
  },
  {
    id: "holistic-support",
    label: "Holistic Support Capsule",
    cost: 3500,
    upkeep: 55,
    severityBoost: 0.3,
    welfareBoost: 1.5,
    description: "Comfort tech that keeps patients calm and cooperative.",
    color: "#34d399",
  },
];

const ROOM_DECOR_LIBRARY = [
  {
    id: "calming-plants",
    label: "Calming Planters",
    cost: 800,
    upkeep: 10,
    environment: 2,
    welfare: 1,
    morale: 1,
    reputation: 0,
    description: "Greenery that softens clinical edges.",
    color: "#22c55e",
    isPlant: true,
  },
  {
    id: "art-installation",
    label: "Art Installation",
    cost: 1100,
    upkeep: 14,
    environment: 1,
    welfare: 1,
    morale: 0,
    reputation: 1,
    description: "Gallery-worthy pieces for a prestige boost.",
    color: "#a855f7",
  },
  {
    id: "luxury-seating",
    label: "Luxury Seating",
    cost: 1500,
    upkeep: 18,
    environment: 1,
    welfare: 2,
    morale: 2,
    reputation: 1,
    description: "Plush lounges that keep visitors smiling.",
    color: "#facc15",
  },
  {
    id: "healing-sculpture",
    label: "Healing Sculpture",
    cost: 950,
    upkeep: 12,
    environment: 1,
    welfare: 1,
    morale: 1,
    reputation: 1,
    description: "Centerpiece art celebrating recovery stories.",
    color: "#0ea5e9",
  },
  {
    id: "snack-vendor",
    label: "Snack Machine",
    cost: 650,
    upkeep: 8,
    environment: 0.2,
    welfare: 1,
    morale: 1,
    reputation: 0,
    description: "Dispenses quick bites that cheer up waiting patients (and create a little litter).",
    color: "#fb7185",
    amenityType: "snack",
    amenityLabel: "Snacks",
  },
  {
    id: "atm-kiosk",
    label: "ATM Kiosk",
    cost: 950,
    upkeep: 9,
    environment: 0.5,
    welfare: 0,
    morale: 0,
    reputation: 1,
    description: "Cash-point services that earn small fees and reassure guests.",
    color: "#0ea5e9",
    amenityType: "atm",
    amenityLabel: "ATM",
  },
  {
    id: "hydration-station",
    label: "Hydration Station",
    cost: 700,
    upkeep: 7,
    environment: 1,
    welfare: 1,
    morale: 0,
    reputation: 0,
    description: "Water coolers and cups that keep everyone refreshed.",
    color: "#60a5fa",
    amenityType: "hydration",
    amenityLabel: "Hydration",
  },
  {
    id: "hanging-garden",
    label: "Hanging Garden",
    cost: 900,
    upkeep: 11,
    environment: 2,
    welfare: 1,
    morale: 1,
    reputation: 0,
    description: "Vertical planters that need routine watering but elevate the ambience.",
    color: "#4ade80",
    isPlant: true,
  },
];

const roomCatalog = [
  {
    id: "reception",
    name: "Reception",
    cost: 4500,
    upkeep: 150,
    roleRequired: ["assistant"],
    reputation: 1,
    description: "Welcomes new arrivals and keeps the queue orderly.",
  },
  {
    id: "triage",
    name: "Triage Desk",
    cost: 5200,
    upkeep: 180,
    roleRequired: ["assistant", "nurse"],
    reputation: 2,
    description: "Sorts arrivals and smooths the waiting line before treatment.",
  },
  {
    id: "gp",
    name: "Doctor's Office",
    cost: 6000,
    upkeep: 200,
    roleRequired: ["doctor"],
    reputation: 2,
    description: "Diagnoses patient ailments and sets their treatment plan.",
  },
  {
    id: "psychiatry",
    name: "Psychiatry",
    cost: 14000,
    upkeep: 360,
    roleRequired: ["doctor"],
    reputation: 3,
    description: "Provides therapy for mental health disorders and stress ailments.",
  },
  {
    id: "pediatrics",
    name: "Pediatrics",
    cost: 13000,
    upkeep: 340,
    roleRequired: ["doctor", "nurse"],
    reputation: 3,
    description: "Bright ward for children with extra play space and comfort.",
  },
  {
    id: "maternity",
    name: "Maternity Suite",
    cost: 17000,
    upkeep: 420,
    roleRequired: ["doctor", "midwife"],
    reputation: 4,
    description: "Delivers new arrivals with calming decor and specialised care.",
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    cost: 8000,
    upkeep: 250,
    roleRequired: ["nurse"],
    reputation: 3,
    description: "Dispenses medicine for low severity conditions.",
  },
  {
    id: "ward",
    name: "Ward",
    cost: 12000,
    upkeep: 360,
    roleRequired: ["doctor", "nurse"],
    reputation: 4,
    description: "Treats moderate conditions requiring overnight care.",
  },
  {
    id: "diagnostics",
    name: "Diagnostics Lab",
    cost: 15000,
    upkeep: 420,
    roleRequired: ["doctor"],
    reputation: 4,
    description: "Runs advanced tests to speed up treatment chains.",
  },
  {
    id: "cardiology",
    name: "Cardiology",
    cost: 20000,
    upkeep: 520,
    roleRequired: ["doctor", "nurse"],
    reputation: 5,
    description: "Monitors heart health and treats rhythm-related illnesses.",
  },
  {
    id: "orthopedics",
    name: "Orthopedics",
    cost: 19000,
    upkeep: 480,
    roleRequired: ["doctor", "therapist"],
    reputation: 4,
    description: "Fixes broken bones and mobility issues with rehab stations.",
  },
  {
    id: "neurology",
    name: "Neurology",
    cost: 21000,
    upkeep: 540,
    roleRequired: ["doctor", "technician"],
    reputation: 5,
    description: "Maps brain activity with scanners and quiet monitoring pods.",
  },
  {
    id: "dermatology",
    name: "Dermatology",
    cost: 10000,
    upkeep: 260,
    roleRequired: ["doctor"],
    reputation: 2,
    description: "Treats skin conditions with UV bays and soothing creams.",
  },
  {
    id: "gastro",
    name: "Gastroenterology",
    cost: 16000,
    upkeep: 400,
    roleRequired: ["doctor", "nurse"],
    reputation: 4,
    description: "Investigates digestive disorders with scopes and recovery chairs.",
  },
  {
    id: "dialysis",
    name: "Dialysis",
    cost: 15000,
    upkeep: 420,
    roleRequired: ["nurse", "technician"],
    reputation: 4,
    description: "Filters blood with high-tech machines for chronic patients.",
  },
  {
    id: "physiotherapy",
    name: "Physiotherapy",
    cost: 12500,
    upkeep: 320,
    roleRequired: ["nurse"],
    reputation: 3,
    description: "Rehabilitates injuries and mobility issues with guided exercise.",
  },
  {
    id: "oncology",
    name: "Oncology",
    cost: 22000,
    upkeep: 560,
    roleRequired: ["doctor", "technician"],
    reputation: 5,
    description: "Provides chemo bays and support zones for cancer patients.",
  },
  {
    id: "burn",
    name: "Burn Unit",
    cost: 23000,
    upkeep: 600,
    roleRequired: ["doctor", "nurse", "therapist"],
    reputation: 5,
    description: "Cares for severe burns with hydro tanks and pain therapy booths.",
  },
  {
    id: "dental",
    name: "Dental Surgery",
    cost: 9000,
    upkeep: 260,
    roleRequired: ["dentist", "assistant"],
    reputation: 3,
    description: "Restores smiles with chrome chairs and high-powered polishers.",
  },
  {
    id: "ophthalmology",
    name: "Ophthalmology",
    cost: 18000,
    upkeep: 520,
    roleRequired: ["doctor", "technician"],
    reputation: 4,
    description: "Performs delicate eye work with laser rigs and dark testing rooms.",
  },
  {
    id: "surgery",
    name: "Operating Theatre",
    cost: 26000,
    upkeep: 900,
    roleRequired: ["surgeon", "nurse"],
    reputation: 6,
    description: "Performs complex procedures for severe conditions.",
  },
  {
    id: "icu",
    name: "Intensive Care Unit",
    cost: 24000,
    upkeep: 820,
    roleRequired: ["doctor", "nurse"],
    reputation: 5,
    description: "Stabilises critical patients and boosts emergency reputation.",
  },
  {
    id: "emergency",
    name: "Emergency Department",
    cost: 24000,
    upkeep: 780,
    roleRequired: ["doctor", "nurse", "security"],
    reputation: 6,
    description: "Handles urgent arrivals with crash bays and trauma carts.",
  },
  {
    id: "research",
    name: "Research Lab",
    cost: 18000,
    upkeep: 550,
    roleRequired: ["researcher"],
    reputation: 5,
    description: "Unlocks new cures and room upgrades.",
  },
  {
    id: "cafeteria",
    name: "Wellness Cafeteria",
    cost: 9000,
    upkeep: 260,
    roleRequired: ["assistant"],
    reputation: 2,
    description: "Keeps patients waiting happy and lifts staff morale.",
  },
  {
    id: "gourmet",
    name: "Gourmet Kitchen",
    cost: 11000,
    upkeep: 320,
    roleRequired: ["chef", "assistant"],
    reputation: 3,
    description: "Serves signature meals to energise staff and pamper VIPs.",
  },
  {
    id: "giftshop",
    name: "Gift Shop",
    cost: 6500,
    upkeep: 160,
    roleRequired: ["assistant"],
    reputation: 2,
    description: "Sells plush mascots and boosts visitor satisfaction.",
  },
  {
    id: "clowncare",
    name: "Clown Care Ward",
    cost: 9000,
    upkeep: 260,
    roleRequired: ["entertainer"],
    reputation: 3,
    description: "Inspired by Theme Hospital antics to keep spirits high.",
  },
  {
    id: "holotheatre",
    name: "Holotheatre",
    cost: 12500,
    upkeep: 320,
    roleRequired: ["entertainer", "assistant"],
    reputation: 3,
    description: "Projects Biing-style cabaret holograms minus the risqué bits.",
  },
  {
    id: "zen",
    name: "Zen Garden",
    cost: 8000,
    upkeep: 220,
    roleRequired: ["therapist"],
    reputation: 2,
    description: "Restorative retreat with koi ponds for stressed staff.",
  },
  {
    id: "securityoffice",
    name: "Security Office",
    cost: 7000,
    upkeep: 200,
    roleRequired: ["security"],
    reputation: 2,
    description: "Keeps troublemakers in check and smooths emergency response.",
  },
  {
    id: "billing",
    name: "Billing Office",
    cost: 10500,
    upkeep: 300,
    roleRequired: ["accountant"],
    reputation: 3,
    description: "Optimises invoices for better payouts and financial tracking.",
  },
  {
    id: "marketing",
    name: "Public Relations Suite",
    cost: 9500,
    upkeep: 220,
    roleRequired: ["marketer"],
    reputation: 2,
    description: "Launch campaigns to attract lucrative patient groups.",
  },
  {
    id: "staffroom",
    name: "Staff Lounge",
    cost: 7000,
    upkeep: 160,
    roleRequired: [],
    reputation: 1,
    description: "Boosts staff morale and reduces burnout.",
  },
];

const baseSeverityMap = {
  reception: 0,
  triage: 1,
  gp: 2,
  psychiatry: 2,
  pediatrics: 2,
  maternity: 3,
  pharmacy: 1,
  ward: 2,
  diagnostics: 2,
  cardiology: 3,
  orthopedics: 3,
  neurology: 3,
  dermatology: 2,
  gastro: 3,
  dialysis: 3,
  physiotherapy: 2,
  oncology: 4,
  burn: 4,
  dental: 2,
  ophthalmology: 3,
  surgery: 4,
  icu: 4,
  emergency: 3,
  cafeteria: 0,
  gourmet: 0,
  giftshop: 0,
  billing: 0,
  marketing: 0,
  clowncare: 1,
  holotheatre: 1,
  zen: 1,
  research: 0,
  securityoffice: 0,
  staffroom: 0,
  radiology: 3,
};

const defaultDesignProfile = {
  sizes: ROOM_SIZE_LIBRARY.map((option) => option.id),
  interiors: ROOM_INTERIOR_LIBRARY.map((theme) => theme.id),
  machines: ROOM_MACHINE_LIBRARY.map((machine) => machine.id),
  decor: ROOM_DECOR_LIBRARY.map((decor) => decor.id),
  defaultMachines: ["standard-kit"],
};

roomCatalog.forEach((room) => {
  room.baseSeverity = baseSeverityMap[room.id] ?? 1;
  room.designProfile = {
    sizes: [...defaultDesignProfile.sizes],
    interiors: [...defaultDesignProfile.interiors],
    machines:
      (baseSeverityMap[room.id] ?? 1) > 0 ? [...defaultDesignProfile.machines] : ["standard-kit"],
    decor: [...defaultDesignProfile.decor],
    defaultMachines: [...defaultDesignProfile.defaultMachines],
  };
  if ((baseSeverityMap[room.id] ?? 1) <= 0) {
    room.designProfile.machines = ["standard-kit"];
  }
});

const staffCatalog = [
  {
    role: "doctor",
    namePool: ["Dr. Nova Halley", "Dr. Elias Quill", "Dr. Miri Vega", "Dr. Jun Pierce"],
    salary: [900, 1100],
    traits: ["Bedside manner", "Diagnostic genius", "Fast learner", "Research enthusiast"],
  },
  {
    role: "nurse",
    namePool: ["Nurse Aiko", "Nurse Lucien", "Nurse Piper", "Nurse Saffron"],
    salary: [650, 850],
    traits: ["Efficient", "Empathetic", "Inventory hawk", "Inspiring"],
  },
  {
    role: "assistant",
    namePool: ["Maya Front", "Theo Ledger", "Rae Burst", "Ivy Kios"],
    salary: [450, 600],
    traits: ["Charismatic", "Queue master", "Patient whisperer", "Energetic"],
  },
  {
    role: "janitor",
    namePool: ["Vik Sweep", "Chaz Buff", "Vera Shine", "Kato Mop"],
    salary: [380, 520],
    traits: ["Meticulous", "Fast cleaner", "Mechanic", "Green thumb"],
  },
  {
    role: "facility",
    namePool: ["Mina Grove", "Odin Wells", "Clara Bloom", "Zed Rinse"],
    salary: [420, 600],
    traits: ["Plant whisperer", "Spill scout", "Sparkling tidy", "Logistics ace"],
  },
  {
    role: "researcher",
    namePool: ["Dr. Lyra Code", "Analyst Vex", "Dr. Reva Coil", "Milo Synth"],
    salary: [700, 950],
    traits: ["Innovator", "Grant magnet", "Focused", "Collaborative"],
  },
  {
    role: "marketer",
    namePool: ["Ada Pitch", "Rowan Buzz", "Nix Viral", "Tara Prism"],
    salary: [500, 680],
    traits: ["Storyteller", "Analytical", "Hype builder", "Networked"],
  },
  {
    role: "surgeon",
    namePool: ["Dr. Mira Scalpel", "Dr. Orion Bloom", "Dr. Zia Voss", "Dr. Helio Mars"],
    salary: [1200, 1500],
    traits: ["Calm hands", "Rapid recovery", "Team lead", "Minimal scarring"],
  },
  {
    role: "technician",
    namePool: ["Ray Pulse", "Iris Beam", "Nico Magnet", "Kara Scan"],
    salary: [580, 760],
    traits: ["Precision", "Calibrates fast", "Empathic", "Data driven"],
  },
  {
    role: "accountant",
    namePool: ["Pia Ledger", "Miles Tally", "June Audit", "Cai Balance"],
    salary: [520, 720],
    traits: ["Eagle eye", "Negotiator", "Budget hawk", "Calm"],
  },
  {
    role: "midwife",
    namePool: ["Mara Bloom", "Leah Cradle", "Ina Dove", "Ruth Lulla"],
    salary: [700, 900],
    traits: ["Gentle", "Quick hands", "Reassuring", "Songbird"],
  },
  {
    role: "therapist",
    namePool: ["Galen Flex", "Noor Mend", "Ravi Align", "Elara Sooth"],
    salary: [680, 880],
    traits: ["Motivator", "Massage pro", "Mindful", "Stretch guru"],
  },
  {
    role: "entertainer",
    namePool: ["Bobo Spark", "Luna Gag", "Pip Confetti", "Dex Pratfall"],
    salary: [520, 720],
    traits: ["Slapstick", "Improv", "Balloon artist", "Banters"],
  },
  {
    role: "security",
    namePool: ["Axel Guard", "Mira Watch", "Jett Shield", "Tova Brace"],
    salary: [550, 750],
    traits: ["Alert", "Crowd control", "Cool head", "Swift"],
  },
  {
    role: "dentist",
    namePool: ["Dr. Pearl", "Dr. Molar", "Dr. Varnish", "Dr. Crown"],
    salary: [780, 980],
    traits: ["Gentle touch", "Laser focus", "Minty", "Cosmetic ace"],
  },
  {
    role: "chef",
    namePool: ["Chef Basil", "Chef Lumen", "Chef Pico", "Chef Dahlia"],
    salary: [560, 760],
    traits: ["Flambé", "Comfort food", "Nutritionist", "Speedy"],
  },
];

const billingProfiles = [
  {
    id: "insured-basic",
    label: "Insurance - Basic",
    modifier: 0.9,
    coverage: 0.75,
    copay: 125,
    method: "insurance",
    color: "#38bdf8",
  },
  {
    id: "insured-premium",
    label: "Insurance - Premium",
    modifier: 1.05,
    coverage: 0.9,
    copay: 80,
    method: "insurance",
    color: "#0ea5e9",
  },
  {
    id: "self-credit",
    label: "Self-Pay (Credit)",
    modifier: 1.1,
    coverage: 0,
    processingFee: 0.025,
    method: "credit",
    color: "#f97316",
  },
  {
    id: "self-cash",
    label: "Self-Pay (Cash)",
    modifier: 0.95,
    coverage: 0,
    discount: 0.05,
    method: "cash",
    color: "#facc15",
  },
  {
    id: "installment",
    label: "Installment Plan",
    modifier: 1,
    coverage: 0,
    depositRate: 0.2,
    term: 10,
    method: "installment",
    color: "#a855f7",
  },
  {
    id: "charity",
    label: "Charity Care",
    modifier: 0.7,
    coverage: 0.5,
    copay: 0,
    method: "insurance",
    color: "#c084fc",
    discount: 0.2,
  },
];

const patientNames = [
  "Alex",
  "Charlie",
  "Dakota",
  "Jules",
  "Robin",
  "Sasha",
  "Emerson",
  "Hayden",
  "Nova",
  "Ezra",
  "Finley",
  "Kai",
  "River",
  "Skye",
  "Rowan",
  "Phoenix",
];

const loanOffers = [
  {
    id: "starter",
    name: "Starter Expansion Loan",
    amount: 25000,
    term: 8,
    interestRate: 0.12,
    desc: "Short-term cash for early renovations. Paid back over eight days.",
  },
  {
    id: "growth",
    name: "Growth Capital Loan",
    amount: 50000,
    term: 14,
    interestRate: 0.18,
    desc: "Fuel new departments with a longer repayment window and higher interest.",
  },
  {
    id: "infrastructure",
    name: "Infrastructure Bond",
    amount: 90000,
    term: 20,
    interestRate: 0.25,
    desc: "Big investment for state-of-the-art wings — mind the sizable repayments.",
  },
];

const researchProjects = [
  {
    id: "imaging",
    name: "Advanced Imaging",
    desc: "Unlocks a Radiology ward that doubles diagnosis accuracy.",
    cost: 3000,
    progress: 0,
    unlocked: false,
  },
  {
    id: "biofilter",
    name: "Bio-filtered Air",
    desc: "Boosts cleanliness and reduces infection risk hospital-wide.",
    cost: 2500,
    progress: 0,
    unlocked: false,
  },
  {
    id: "wellness",
    name: "Holistic Wellness",
    desc: "Adds a spa upgrade to the Staff Lounge for morale.",
    cost: 2000,
    progress: 0,
    unlocked: false,
  },
];

const marketingCampaigns = [
  {
    id: "prime",
    name: "Prime Time Media Blast",
    desc: "Boosts daily patient flow by 30% for three days.",
    cost: 4000,
    duration: 3,
  },
  {
    id: "investors",
    name: "Investor Showcase",
    desc: "Gain an instant ¤6000 infusion but scrutiny lowers reputation if morale drops.",
    cost: 2500,
    duration: 1,
  },
  {
    id: "community",
    name: "Community Health Fair",
    desc: "Raises reputation by 5 and attracts low-income patients (lower fees).",
    cost: 1800,
    duration: 2,
  },
];

const ailments = [
  { id: "coldsnap", name: "Cold Snap", severity: 1, room: "gp", payout: 850 },
  { id: "sugarcrash", name: "Sugar Crash", severity: 1, room: "pharmacy", payout: 900 },
  { id: "flatline", name: "Flatline Fever", severity: 2, room: "ward", payout: 1600 },
  { id: "fractured", name: "Fractured Ego", severity: 2, room: "gp", payout: 1200 },
  { id: "burnout", name: "Starlight Burnout", severity: 2, room: "psychiatry", payout: 1800 },
  { id: "panic", name: "Cosmic Panic", severity: 3, room: "psychiatry", payout: 2600 },
  { id: "phantom", name: "Phantom Limelight", severity: 3, room: "diagnostics", payout: 2200 },
  { id: "appendix", name: "Appendix Boom", severity: 3, room: "surgery", payout: 3200 },
  { id: "cardio", name: "Rhythm Crash", severity: 3, room: "cardiology", payout: 3400 },
  { id: "sprain", name: "Nebula Sprain", severity: 2, room: "physiotherapy", payout: 1500 },
  { id: "stiff", name: "Stellar Stiffness", severity: 1, room: "physiotherapy", payout: 1100 },
  { id: "hypergly", name: "Hyper Glow", severity: 2, room: "cafeteria", payout: 950 },
  { id: "papertrail", name: "Paper Trail Phobia", severity: 1, room: "billing", payout: 700 },
  { id: "meteormeasles", name: "Meteor Measles", severity: 2, room: "pediatrics", payout: 1700 },
  { id: "toybox", name: "Toy Box Fever", severity: 1, room: "pediatrics", payout: 1200 },
  { id: "lunarcramps", name: "Lunar Cramps", severity: 3, room: "maternity", payout: 3000 },
  { id: "spacecolic", name: "Space Colic", severity: 2, room: "maternity", payout: 2100 },
  { id: "asteroidache", name: "Asteroid Ache", severity: 2, room: "orthopedics", payout: 2300 },
  { id: "gravitygrind", name: "Gravity Grind", severity: 2, room: "orthopedics", payout: 2400 },
  { id: "neuroflash", name: "Neuro Flash", severity: 3, room: "neurology", payout: 3200 },
  { id: "synapse", name: "Synapse Static", severity: 4, room: "neurology", payout: 3600 },
  { id: "solarrash", name: "Solar Rash", severity: 1, room: "dermatology", payout: 950 },
  { id: "moonburn", name: "Moon Burn", severity: 2, room: "dermatology", payout: 1500 },
  { id: "warpbelly", name: "Warp Belly", severity: 3, room: "gastro", payout: 2800 },
  { id: "stomavortex", name: "Stoma Vortex", severity: 2, room: "gastro", payout: 2100 },
  { id: "nebularinse", name: "Nebula Rinse", severity: 3, room: "dialysis", payout: 2700 },
  { id: "plasmabuild", name: "Plasma Build-Up", severity: 4, room: "dialysis", payout: 3100 },
  { id: "quantumcells", name: "Quantum Cells", severity: 4, room: "oncology", payout: 3800 },
  { id: "supernova", name: "Supernova Stress", severity: 3, room: "oncology", payout: 3400 },
  { id: "emberveil", name: "Ember Veil", severity: 4, room: "burn", payout: 3600 },
  { id: "flareburst", name: "Flare Burst", severity: 3, room: "burn", payout: 3100 },
  { id: "cosmiccavity", name: "Cosmic Cavity", severity: 1, room: "dental", payout: 1200 },
  { id: "jawsaw", name: "Jaw Saw", severity: 2, room: "dental", payout: 2000 },
  { id: "galaxyglare", name: "Galaxy Glare", severity: 2, room: "ophthalmology", payout: 2200 },
  { id: "nebulacurtain", name: "Nebula Curtain", severity: 3, room: "ophthalmology", payout: 2800 },
  { id: "laughitis", name: "Laugh-itis", severity: 1, room: "clowncare", payout: 950 },
  { id: "sadzap", name: "Sad Zap", severity: 2, room: "holotheatre", payout: 1500 },
  { id: "zenless", name: "Zenless Zing", severity: 1, room: "zen", payout: 1000 },
];

ailments.forEach((ailment) => {
  const base = ailment.payout;
  const severityBoost = 1 + (ailment.severity ?? 1) * 0.12;
  const baseline = base * 1.25 * severityBoost;
  ailment.charge = Math.round(baseline / 10) * 10;
});

const emergencyCases = [
  { id: "superbug", name: "Superbug Outbreak", severity: 4, room: "icu", payout: 4200 },
  { id: "heartquake", name: "Heartquake", severity: 4, room: "surgery", payout: 4600 },
  { id: "voidfracture", name: "Void Fracture", severity: 4, room: "radiology", payout: 3800 },
  { id: "soulstorm", name: "Soul Storm", severity: 4, room: "psychiatry", payout: 3600 },
  { id: "cardioblast", name: "Cardio Blast", severity: 4, room: "cardiology", payout: 4400 },
  { id: "starlabor", name: "Starfall Labour", severity: 4, room: "maternity", payout: 4200 },
  { id: "brainflare", name: "Brain Flare", severity: 5, room: "neurology", payout: 4700 },
  { id: "toxicwave", name: "Toxic Wave", severity: 4, room: "gastro", payout: 4100 },
  { id: "emberstorm", name: "Ember Storm", severity: 5, room: "burn", payout: 4800 },
  { id: "voidmilk", name: "Void Milk Recall", severity: 4, room: "pediatrics", payout: 3900 },
  { id: "opticblast", name: "Optic Blast", severity: 4, room: "ophthalmology", payout: 4300 },
  { id: "dialysisurge", name: "Dialysis Surge", severity: 4, room: "dialysis", payout: 4000 },
];

emergencyCases.forEach((emergency) => {
  const base = emergency.payout;
  const severityBoost = 1 + (emergency.severity ?? 3) * 0.18;
  const baseline = base * 1.3 * severityBoost;
  emergency.charge = Math.round(baseline / 10) * 10;
});

const objectives = [
  {
    id: "build-reception",
    text: "Build a Reception to guide arrivals.",
    condition: (state) => state.rooms.some((r) => r.type === "reception"),
    completed: false,
  },
  {
    id: "hire-doctor",
    text: "Hire at least two doctors.",
    condition: (state) => state.staff.filter((s) => s.role === "doctor").length >= 2,
    completed: false,
  },
  {
    id: "treat-ten",
    text: "Treat 10 patients.",
    condition: (state) => state.stats.patientsTreated >= 10,
    completed: false,
  },
  {
    id: "reach-rep",
    text: "Reach reputation 75.",
    condition: (state) => state.stats.reputation >= 75,
    completed: false,
  },
];

const deepClone = (input) => JSON.parse(JSON.stringify(input));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeHex = (hex) => {
  if (!hex) return "#000000";
  let value = hex.trim();
  if (value.startsWith("rgb")) {
    const parts = value
      .replace(/rgba?\(/, "")
      .replace(/\)/, "")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((part, index) => index < 3 && Number.isFinite(part));
    if (parts.length === 3) {
      const [r, g, b] = parts.map((channel) => clamp(Math.round(channel), 0, 255));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return "#000000";
  }
  if (!value.startsWith("#")) {
    value = `#${value}`;
  }
  if (value.length === 4) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (value.length < 7) {
    value = `${value}${"0".repeat(7 - value.length)}`;
  }
  return value.slice(0, 7).toLowerCase();
};

const shiftColor = (hex, percent = 0) => {
  const value = normalizeHex(hex);
  const amount = clamp(percent, -1, 1);
  const num = parseInt(value.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r = Math.round(r + (255 - r) * amount);
    g = Math.round(g + (255 - g) * amount);
    b = Math.round(b + (255 - b) * amount);
  } else {
    const factor = 1 + amount;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  }
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const hexToRgb = (hex) => {
  const value = normalizeHex(hex);
  const num = parseInt(value.slice(1), 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
};

const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const createPropertyState = () =>
  PROPERTY_PARCELS.map((parcel) => ({ ...parcel, owned: parcel.cost === 0 }));

const getParcelAt = (x, y) =>
  state.properties.find(
    (parcel) =>
      x >= parcel.x &&
      x < parcel.x + parcel.width &&
      y >= parcel.y &&
      y < parcel.y + parcel.height
  ) ?? null;

const isTileUnlocked = (x, y) => {
  const parcel = getParcelAt(x, y);
  return Boolean(parcel && parcel.owned);
};

const getPropertyById = (id) => state.properties.find((parcel) => parcel.id === id);
const getOwnedProperties = () => state.properties.filter((parcel) => parcel.owned);

const state = {
  grid: Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(null)),
  rooms: [],
  staff: [],
  candidates: [],
  marketingEffects: [],
  projects: deepClone(researchProjects),
  campaigns: deepClone(marketingCampaigns),
  objectives: deepClone(objectives),
  queue: [],
  billingRecords: [],
  loans: [],
  installmentPlans: [],
  properties: createPropertyState(),
  litter: 0,
  ambience: { environment: 0, welfare: 0, morale: 0, reputation: 0 },
  stats: {
    day: 1,
    tick: 0,
    cash: STARTING_CASH,
    reputation: 50,
    patientsTreated: 0,
    cleanliness: 75,
    efficiency: 60,
    morale: 70,
    grounds: 72,
    plantCare: 78,
    revenueToday: 0,
    expensesToday: 0,
    environmentScore: 55,
    welfareScore: 55,
  },
};

const elements = {
  grid: document.querySelector("#grid"),
  hospitalCanvas: document.querySelector("#hospital-canvas"),
  axisX: document.querySelector("#axis-x"),
  axisY: document.querySelector("#axis-y"),
  buildOptions: document.querySelector("#build-options"),
  buildHint: document.querySelector("#build-hint"),
  blueprintFootnote: document.querySelector("#blueprint-footnote"),
  property: {
    market: document.querySelector("#property-market"),
    owned: document.querySelector("#property-owned"),
  },
  statDay: document.querySelector("#stat-day"),
  statCash: document.querySelector("#stat-cash"),
  statReputation: document.querySelector("#stat-reputation"),
  statTreated: document.querySelector("#stat-treated"),
  statEnvironment: document.querySelector("#stat-environment"),
  statWelfare: document.querySelector("#stat-welfare"),
  patientQueue: document.querySelector("#patient-queue"),
  eventLog: document.querySelector("#event-log"),
  staffCandidates: document.querySelector("#staff-candidates"),
  staffRoster: document.querySelector("#staff-roster"),
  researchProjects: document.querySelector("#research-projects"),
  marketingCampaigns: document.querySelector("#marketing-campaigns"),
  dailyReport: document.querySelector("#daily-report"),
  objectives: document.querySelector("#objectives"),
  billingLedger: document.querySelector("#billing-ledger"),
  finance: {
    loanOffers: document.querySelector("#loan-offers"),
    activeLoans: document.querySelector("#active-loans"),
    receivables: document.querySelector("#receivables-summary"),
  },
  meters: {
    cleanliness: document.querySelector("#meter-cleanliness"),
    efficiency: document.querySelector("#meter-efficiency"),
    morale: document.querySelector("#meter-morale"),
    grounds: document.querySelector("#meter-grounds"),
    plant: document.querySelector("#meter-plants"),
  },
  policies: {
    fastTrack: document.querySelector("#policy-fast-track"),
    overtime: document.querySelector("#policy-overtime"),
  },
  designer: {
    size: document.querySelector("#designer-size"),
    theme: document.querySelector("#designer-theme"),
    machines: document.querySelector("#designer-machines"),
    decor: document.querySelector("#designer-decor"),
    summary: document.querySelector("#designer-summary"),
    apply: document.querySelector("#designer-apply"),
  },
  builtRooms: document.querySelector("#built-rooms"),
};

const menuOptions = Array.from(document.querySelectorAll(".menu-option"));

let selectedRoom = null;
let patientIdCounter = 1;
let roomIdCounter = 1;
let staffIdCounter = 1;
let hospitalCtx = null;
let blueprintBuffer = null;
let emptyTileSprite = null;
let lockedTileSprite = null;
const themedTileCache = new Map();

const invalidateCanvasCache = () => {
  blueprintBuffer = null;
  emptyTileSprite = null;
  lockedTileSprite = null;
  themedTileCache.clear();
};

const createOffscreenCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getBlueprintBuffer = (width, height) => {
  if (!blueprintBuffer || blueprintBuffer.width !== width || blueprintBuffer.height !== height) {
    blueprintBuffer = createOffscreenCanvas(width, height);
    const ctx = blueprintBuffer.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#0f172a");
    backdrop.addColorStop(0.45, "#111d36");
    backdrop.addColorStop(1, "#0b1220");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.15,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.78
    );
    vignette.addColorStop(0, "rgba(56, 189, 248, 0.18)");
    vignette.addColorStop(0.45, "rgba(30, 64, 175, 0.15)");
    vignette.addColorStop(1, "rgba(8, 47, 73, 0.02)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.2)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= GRID_WIDTH; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * CANVAS_CELL, 0);
      ctx.lineTo(gx * CANVAS_CELL, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_HEIGHT; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * CANVAS_CELL);
      ctx.lineTo(width, gy * CANVAS_CELL);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(94, 234, 212, 0.15)";
    for (let gy = 0; gy < GRID_HEIGHT; gy++) {
      for (let gx = 0; gx < GRID_WIDTH; gx++) {
        ctx.beginPath();
        ctx.arc(gx * CANVAS_CELL, gy * CANVAS_CELL, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 0.3;
    ctx.setLineDash([6, 18]);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(14, 165, 233, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "rgba(56, 189, 248, 0.32)";
    ctx.shadowBlur = 18;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.restore();

    ctx.save();
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(191, 219, 254, 0.45)";
    ctx.textBaseline = "top";
    ctx.fillText("Pulse Point Campus", 24, 18);
    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(125, 211, 252, 0.65)";
    ctx.fillText("Blueprint Level 1", 24, 40);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(148, 197, 255, 0.4)";
    ctx.fillText(`${GRID_WIDTH}×${GRID_HEIGHT} tiles`, width - 24, height - 24);
    ctx.restore();
  }
  return blueprintBuffer;
};

const getEmptyTileSprite = () => {
  if (!emptyTileSprite) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    const tileGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    tileGradient.addColorStop(0, withAlpha("#1e293b", 0.75));
    tileGradient.addColorStop(1, withAlpha("#020617", 0.55));
    ctx.fillStyle = tileGradient;
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, 2, 0, CANVAS_CELL - 2);
    sheen.addColorStop(0, "rgba(148, 197, 255, 0.28)");
    sheen.addColorStop(0.4, "rgba(148, 197, 255, 0.12)");
    sheen.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4);
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 6) {
      ctx.beginPath();
      ctx.moveTo(offset, 2);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL - 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(226, 232, 240, 0.18)";
    ctx.beginPath();
    ctx.arc(CANVAS_CELL / 2, CANVAS_CELL / 2 + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, CANVAS_CELL - 1, CANVAS_CELL - 1);
    emptyTileSprite = canvas;
  }
  return emptyTileSprite;
};

const getLockedTileSprite = () => {
  if (!lockedTileSprite) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 2, 2, CANVAS_CELL - 4, CANVAS_CELL - 4, 8);
    ctx.clip();
    const hatch = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    hatch.addColorStop(0, "rgba(148, 163, 184, 0.35)");
    hatch.addColorStop(1, "rgba(148, 163, 184, 0.05)");
    ctx.strokeStyle = hatch;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 5]);
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 6) {
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(1.5, 1.5, CANVAS_CELL - 3, CANVAS_CELL - 3);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148, 197, 255, 0.35)";
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("For", CANVAS_CELL / 2, CANVAS_CELL / 2 - 2);
    ctx.fillText("Sale", CANVAS_CELL / 2, CANVAS_CELL / 2 + 10);
    lockedTileSprite = canvas;
  }
  return lockedTileSprite;
};

const getRoomTileSprite = (theme, visualKey, visual) => {
  const palette = theme?.palette ?? {};
  const cacheKey = [
    visualKey,
    palette.base ?? visual?.color ?? "",
    palette.mid ?? "",
    palette.accent ?? "",
  ].join("|");
  if (!themedTileCache.has(cacheKey)) {
    const canvas = createOffscreenCanvas(CANVAS_CELL, CANVAS_CELL);
    const ctx = canvas.getContext("2d");
    const baseColor = palette.base ?? visual?.color ?? "#475569";
    const accentColor = palette.mid ?? visual?.color ?? "#475569";
    ctx.save();
    ctx.shadowColor = withAlpha(accentColor, 0.25);
    ctx.shadowBlur = 12;
    const baseGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL);
    baseGradient.addColorStop(0, shiftColor(baseColor, 0.18));
    baseGradient.addColorStop(0.65, baseColor);
    baseGradient.addColorStop(1, shiftColor(baseColor, -0.2));
    ctx.fillStyle = baseGradient;
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8, 10);
    ctx.fill();
    ctx.save();
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8, 10);
    ctx.clip();
    const floorLight = ctx.createRadialGradient(
      CANVAS_CELL / 2,
      CANVAS_CELL / 2 + 4,
      CANVAS_CELL * 0.15,
      CANVAS_CELL / 2,
      CANVAS_CELL / 2 + 4,
      CANVAS_CELL * 0.9
    );
    floorLight.addColorStop(0, withAlpha(shiftColor(baseColor, 0.35), 0.4));
    floorLight.addColorStop(0.45, withAlpha(shiftColor(baseColor, 0.1), 0.18));
    floorLight.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = floorLight;
    ctx.fillRect(4, 4, CANVAS_CELL - 8, CANVAS_CELL - 8);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = withAlpha(shiftColor(baseColor, -0.25), 0.4);
    ctx.lineWidth = 1;
    for (let offset = -CANVAS_CELL; offset < CANVAS_CELL * 2; offset += 7) {
      ctx.beginPath();
      ctx.moveTo(offset, 4);
      ctx.lineTo(offset - CANVAS_CELL, CANVAS_CELL - 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.shadowBlur = 0;
    const accentGradient = ctx.createLinearGradient(0, 0, CANVAS_CELL, CANVAS_CELL / 2);
    accentGradient.addColorStop(0, withAlpha(accentColor, 0.45));
    accentGradient.addColorStop(1, withAlpha(shiftColor(accentColor, -0.3), 0.1));
    ctx.fillStyle = accentGradient;
    drawRoundedRect(ctx, 4, 4, CANVAS_CELL - 8, CANVAS_CELL / 2.6, 10);
    ctx.fill();
    ctx.save();
    if (visual?.furniture) {
      visual.furniture(ctx, 0, 0);
    }
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, CANVAS_CELL - 1, CANVAS_CELL - 1);
    themedTileCache.set(cacheKey, canvas);
  }
  return themedTileCache.get(cacheKey);
};

const designerState = {
  blueprint: null,
  sizeId: ROOM_SIZE_LIBRARY[0].id,
  interiorId: ROOM_INTERIOR_LIBRARY[0].id,
  machines: new Set(["standard-kit"]),
  decorations: new Set(),
  editingRoomId: null,
  preview: null,
};

const getSizeOption = (id) => ROOM_SIZE_LIBRARY.find((option) => option.id === id) ?? ROOM_SIZE_LIBRARY[0];

const getInteriorTheme = (id) =>
  ROOM_INTERIOR_LIBRARY.find((theme) => theme.id === id) ?? ROOM_INTERIOR_LIBRARY[0];

const getMachineDefinition = (id) =>
  ROOM_MACHINE_LIBRARY.find((machine) => machine.id === id) ?? ROOM_MACHINE_LIBRARY[0];

const getDecorationDefinition = (id) =>
  ROOM_DECOR_LIBRARY.find((decor) => decor.id === id) ?? ROOM_DECOR_LIBRARY[0];

const summarizeRoomDesign = ({ blueprint, sizeId, interiorId, machines, decorations }) => {
  const sizeOption = getSizeOption(sizeId);
  const interior = getInteriorTheme(interiorId);
  const machineDefs = machines.map(getMachineDefinition);
  const decorDefs = decorations.map(getDecorationDefinition);

  const baseCost = Math.round(blueprint.cost * sizeOption.costMultiplier);
  const interiorCost = interior.cost;
  const machineCost = machineDefs.reduce((sum, machine) => sum + machine.cost, 0);
  const decorCost = decorDefs.reduce((sum, decor) => sum + decor.cost, 0);
  const totalCost = baseCost + interiorCost + machineCost + decorCost;

  const baseUpkeep = blueprint.upkeep * sizeOption.upkeepMultiplier + interior.upkeep;
  const machineUpkeep = machineDefs.reduce((sum, machine) => sum + machine.upkeep, 0);
  const decorUpkeep = decorDefs.reduce((sum, decor) => sum + decor.upkeep, 0);
  const totalUpkeep = Math.round(baseUpkeep + machineUpkeep + decorUpkeep);

  const severityBoost =
    sizeOption.severityBonus +
    machineDefs.reduce((sum, machine) => sum + machine.severityBoost, 0) +
    (interior.modifiers?.severityBoost ?? 0);

  const environmentBoost =
    sizeOption.environmentBonus +
    (interior.modifiers?.environment ?? 0) +
    decorDefs.reduce((sum, decor) => sum + decor.environment, 0);
  const welfareBoost =
    (interior.modifiers?.welfare ?? 0) +
    machineDefs.reduce((sum, machine) => sum + (machine.welfareBoost ?? 0), 0) +
    decorDefs.reduce((sum, decor) => sum + decor.welfare, 0);
  const moraleBoost =
    (interior.modifiers?.morale ?? 0) + decorDefs.reduce((sum, decor) => sum + decor.morale, 0);
  const reputationBoost = (interior.modifiers?.reputation ?? 0) + decorDefs.reduce(
    (sum, decor) => sum + decor.reputation,
    0
  );

  return {
    sizeOption,
    interior,
    machines: machineDefs,
    decorations: decorDefs,
    totalCost,
    baseCost,
    interiorCost,
    machineCost,
    decorCost,
    upkeep: totalUpkeep,
    severityBoost,
    environmentBoost,
    welfareBoost,
    moraleBoost,
    reputationBoost,
  };
};

const roomVisuals = {
  reception: {
    color: "#f59e0b",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 4, py + CANVAS_CELL - 18, CANVAS_CELL - 8, 12);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 6);
    },
  },
  triage: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 22, CANVAS_CELL - 16, 14);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 10, 12, 4);
    },
  },
  gp: {
    color: "#60a5fa",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(px + 8, py + 12, 20, 14);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(px + CANVAS_CELL - 24, py + CANVAS_CELL - 24, 16, 12);
    },
  },
  psychiatry: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0e7490";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#cffafe";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL - 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  pediatrics: {
    color: "#f472b6",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 24);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 8, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  maternity: {
    color: "#f9a8d4",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fdf2f8";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.fillStyle = "#ec4899";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2 + 6, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#be123c";
      ctx.fillRect(px + CANVAS_CELL / 2 - 10, py + CANVAS_CELL - 22, 20, 8);
    },
  },
  pharmacy: {
    color: "#34d399",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 10);
    },
  },
  dermatology: {
    color: "#fb7185",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#9f1239";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(px + CANVAS_CELL - 18, py + 10, 10, 18);
    },
  },
  ward: {
    color: "#f472b6",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#9d174d";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  gastro: {
    color: "#f97316",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, 14);
      ctx.fillStyle = "#7c2d12";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 10, 12, CANVAS_CELL - 36);
    },
  },
  dialysis: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 10, py + 8, CANVAS_CELL - 20, CANVAS_CELL - 24);
      ctx.fillStyle = "#67e8f9";
      ctx.fillRect(px + CANVAS_CELL / 2 - 14, py + CANVAS_CELL - 20, 28, 10);
      ctx.fillStyle = "#06b6d4";
      ctx.fillRect(px + 8, py + 12, 8, 24);
      ctx.fillRect(px + CANVAS_CELL - 16, py + 12, 8, 24);
    },
  },
  diagnostics: {
    color: "#a855f7",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px + 6, py + 6, 10, 10);
    },
  },
  cardiology: {
    color: "#f87171",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.moveTo(px + CANVAS_CELL / 2, py + 16);
      ctx.lineTo(px + CANVAS_CELL - 10, py + CANVAS_CELL / 2);
      ctx.lineTo(px + 10, py + CANVAS_CELL / 2);
      ctx.closePath();
      ctx.fill();
    },
  },
  orthopedics: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 8, py + 12, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#a16207";
      ctx.fillRect(px + CANVAS_CELL / 2 - 4, py + 8, 8, CANVAS_CELL - 24);
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  neurology: {
    color: "#818cf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 24);
      ctx.fillStyle = "#3730a3";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + CANVAS_CELL - 20, 12, 10);
    },
  },
  physiotherapy: {
    color: "#4ade80",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + 6, py + CANVAS_CELL - 20, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + CANVAS_CELL / 2 - 12, py + 8, 24, 8);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px + CANVAS_CELL / 2 - 4, py + 16, 8, CANVAS_CELL - 36);
    },
  },
  oncology: {
    color: "#a855f7",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 24);
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px + 12, py + CANVAS_CELL - 22, CANVAS_CELL - 24, 12);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  burn: {
    color: "#ea580c",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(px + CANVAS_CELL / 2 - 12, py + CANVAS_CELL - 24, 24, 12);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  research: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 10);
    },
  },
  dental: {
    color: "#fcd34d",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fef9c3";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, CANVAS_CELL - 26);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 22, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  ophthalmology: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0ea5e9";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 20);
      ctx.fillStyle = "#bfdbfe";
      ctx.fillRect(px + CANVAS_CELL / 2 - 10, py + CANVAS_CELL - 20, 20, 10);
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 8, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  surgery: {
    color: "#ef4444",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 16);
      ctx.beginPath();
      ctx.moveTo(px + CANVAS_CELL / 2, py + 12);
      ctx.lineTo(px + CANVAS_CELL / 2, py + CANVAS_CELL - 12);
      ctx.stroke();
    },
  },
  icu: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + CANVAS_CELL - 18, py + 8, 10, 26);
    },
  },
  emergency: {
    color: "#ef4444",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fee2e2";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 12);
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(px + CANVAS_CELL / 2 - 3, py + 8, 6, CANVAS_CELL - 24);
      ctx.fillRect(px + 8, py + CANVAS_CELL / 2 - 3, CANVAS_CELL - 16, 6);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  cafeteria: {
    color: "#22c55e",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, 8);
      ctx.fillStyle = "#166534";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 20, CANVAS_CELL - 16, 12);
    },
  },
  gourmet: {
    color: "#facc15",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, 10);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 20, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  giftshop: {
    color: "#c084fc",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#ede9fe";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, CANVAS_CELL - 24);
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 12, 12, 14);
    },
  },
  billing: {
    color: "#38bdf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 8, py + 8, CANVAS_CELL - 16, 10);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
    },
  },
  marketing: {
    color: "#fb923c",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, 12);
      ctx.fillStyle = "#9a3412";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 18, CANVAS_CELL - 20, 8);
    },
  },
  clowncare: {
    color: "#fbbf24",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(px + 6, py + 10, CANVAS_CELL - 12, CANVAS_CELL - 28);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 12);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  holotheatre: {
    color: "#22d3ee",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 8, CANVAS_CELL - 12, CANVAS_CELL - 20);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px + 8, py + CANVAS_CELL - 22, CANVAS_CELL - 16, 12);
      ctx.fillStyle = "rgba(250, 204, 21, 0.8)";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 16, 12, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  zen: {
    color: "#4ade80",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(px + 8, py + 10, CANVAS_CELL - 16, CANVAS_CELL - 28);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(px + CANVAS_CELL / 2 - 8, py + CANVAS_CELL - 22, 16, 12);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + 18, 10, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  securityoffice: {
    color: "#1e293b",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 6, py + 6, CANVAS_CELL - 12, CANVAS_CELL - 12);
      ctx.fillStyle = "#475569";
      ctx.fillRect(px + 10, py + CANVAS_CELL - 20, CANVAS_CELL - 20, 10);
      ctx.fillStyle = "#f87171";
      ctx.fillRect(px + CANVAS_CELL / 2 - 6, py + 12, 12, 12);
    },
  },
  staffroom: {
    color: "#fb7185",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#fecdd3";
      ctx.fillRect(px + 10, py + 10, CANVAS_CELL - 20, 14);
      ctx.fillStyle = "#9f1239";
      ctx.fillRect(px + 12, py + CANVAS_CELL - 20, CANVAS_CELL - 24, 10);
    },
  },
  radiology: {
    color: "#818cf8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#e0e7ff";
      ctx.beginPath();
      ctx.arc(px + CANVAS_CELL / 2, py + CANVAS_CELL / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4338ca";
      ctx.fillRect(px + 6, py + 6, 12, 12);
    },
  },
  default: {
    color: "#94a3b8",
    furniture: (ctx, px, py) => {
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 10, py + 10, CANVAS_CELL - 20, CANVAS_CELL - 20);
    },
  },
};

const logEvent = (message, tone = "neutral") => {
  const entry = document.createElement("li");
  entry.textContent = message;
  entry.classList.add(tone);
  elements.eventLog.prepend(entry);
  while (elements.eventLog.children.length > 8) {
    elements.eventLog.removeChild(elements.eventLog.lastElementChild);
  }
};

const formatCurrency = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const calculateLoanSchedule = (offer) => {
  const principal = offer.amount;
  const dailyRate = offer.term ? offer.interestRate / offer.term : 0;
  if (!offer.term) {
    return { dailyPayment: principal, totalRepay: principal, dailyRate: 0 };
  }
  let dailyPayment;
  if (dailyRate <= 0) {
    dailyPayment = principal / offer.term;
  } else {
    const factor = Math.pow(1 + dailyRate, offer.term);
    dailyPayment = (principal * dailyRate * factor) / (factor - 1);
  }
  dailyPayment = Math.max(1, Math.round(dailyPayment));
  const totalRepay = dailyPayment * offer.term;
  return { dailyPayment, totalRepay, dailyRate };
};

const takeLoan = (offerId) => {
  const offer = loanOffers.find((item) => item.id === offerId);
  if (!offer) return;
  if (state.loans.some((loan) => loan.offerId === offer.id)) {
    logEvent("That loan product is already active.", "warning");
    return;
  }
  const schedule = calculateLoanSchedule(offer);
  const loan = {
    loanId: `loan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    offerId: offer.id,
    name: offer.name,
    principal: offer.amount,
    interestRate: offer.interestRate,
    term: offer.term,
    dailyRate: schedule.dailyRate,
    dailyPayment: schedule.dailyPayment,
    remainingBalance: offer.amount,
    daysRemaining: offer.term,
    totalPaid: 0,
    interestPaid: 0,
  };
  state.loans.push(loan);
  state.stats.cash += offer.amount;
  logEvent(`Secured ${offer.name} for ¤${formatCurrency(offer.amount)}.`, "positive");
  recordLedgerEvent({
    name: "Loan Draw",
    detail: offer.name,
    amount: offer.amount,
    tag: "Loan",
  });
  updateFinancePanels();
  updateStats();
};

const renderLoanOffers = () => {
  if (!elements.finance?.loanOffers) return;
  elements.finance.loanOffers.innerHTML = "";
  loanOffers.forEach((offer) => {
    const card = document.createElement("div");
    card.className = "loan-offer";
    const title = document.createElement("h4");
    title.textContent = offer.name;
    const desc = document.createElement("p");
    desc.textContent = offer.desc;
    const schedule = calculateLoanSchedule(offer);
    const terms = document.createElement("p");
    terms.innerHTML = `<strong>Amount:</strong> ¤${formatCurrency(offer.amount)} • <strong>Term:</strong> ${offer.term} days`;
    const payment = document.createElement("p");
    payment.innerHTML = `<strong>Daily:</strong> ¤${formatCurrency(schedule.dailyPayment)} • <strong>Interest:</strong> ${(offer.interestRate * 100).toFixed(1)}%`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Take Loan";
    if (state.loans.some((loan) => loan.offerId === offer.id)) {
      button.disabled = true;
      button.textContent = "Loan Active";
    }
    button.addEventListener("click", () => takeLoan(offer.id));
    card.append(title, desc, terms, payment, button);
    elements.finance.loanOffers.appendChild(card);
  });
};

const renderActiveLoans = () => {
  if (!elements.finance?.activeLoans) return;
  elements.finance.activeLoans.innerHTML = "";
  if (!state.loans.length) {
    const empty = document.createElement("li");
    empty.textContent = "No active loans";
    elements.finance.activeLoans.appendChild(empty);
    return;
  }
  state.loans.forEach((loan) => {
    const li = document.createElement("li");
    const balance = document.createElement("span");
    balance.innerHTML = `<span>Balance</span><span>¤${formatCurrency(Math.max(0, Math.round(loan.remainingBalance)))}</span>`;
    const payment = document.createElement("span");
    payment.innerHTML = `<span>Daily</span><span>¤${formatCurrency(loan.dailyPayment)}</span>`;
    const days = document.createElement("span");
    days.innerHTML = `<span>Days left</span><span>${Math.max(0, loan.daysRemaining)}</span>`;
    li.innerHTML = `<div><strong>${loan.name}</strong></div>`;
    li.append(balance, payment, days);
    elements.finance.activeLoans.appendChild(li);
  });
};

const renderReceivablesSummary = () => {
  if (!elements.finance?.receivables) return;
  const totalDeferred = state.installmentPlans.reduce((sum, plan) => sum + plan.remaining, 0);
  const activePlans = state.installmentPlans.length;
  elements.finance.receivables.innerHTML = `
    <div><strong>Outstanding:</strong> ¤${formatCurrency(Math.round(totalDeferred))}</div>
    <div><strong>Active Plans:</strong> ${activePlans}</div>
  `;
};

const updateFinancePanels = () => {
  renderLoanOffers();
  renderActiveLoans();
  renderReceivablesSummary();
};

const processLoans = () => {
  if (!state.loans.length) return;
  const remainingLoans = [];
  state.loans.forEach((loan) => {
    const interest = Math.round(loan.remainingBalance * loan.dailyRate);
    const scheduledPayment = Math.min(
      loan.dailyPayment,
      Math.round(loan.remainingBalance + interest)
    );
    const payment = Math.max(0, scheduledPayment);
    loan.remainingBalance = Math.max(0, loan.remainingBalance + interest - payment);
    loan.daysRemaining = Math.max(0, loan.daysRemaining - 1);
    loan.totalPaid += payment;
    loan.interestPaid += interest;
    state.stats.cash -= payment;
    state.stats.expensesToday += payment;
    recordLedgerEvent({
      name: "Loan Payment",
      detail: `${loan.name}${interest ? ` (¤${formatCurrency(interest)} interest)` : ""}`,
      amount: -payment,
      tag: "Loan",
    });
    if (loan.remainingBalance <= 1) {
      logEvent(`${loan.name} repaid in full.`, "positive");
    } else {
      remainingLoans.push(loan);
    }
  });
  state.loans = remainingLoans;
  updateFinancePanels();
};

const addInstallmentPlan = (plan) => {
  if (!plan || plan.remaining <= 0) return;
  const entry = {
    id: `plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patientName: plan.patientName,
    total: plan.total,
    remaining: plan.remaining,
    dailyPayment: plan.dailyPayment,
    daysRemaining: plan.daysRemaining,
  };
  state.installmentPlans.push(entry);
  logEvent(
    `${plan.patientName} set up installments for ¤${formatCurrency(plan.remaining)}.`,
    "neutral"
  );
  recordLedgerEvent({
    name: "Installment Plan",
    detail: `${plan.patientName} balance deferred`,
    amount: 0,
    tag: "Receivable",
  });
  updateFinancePanels();
};

const processInstallments = () => {
  if (!state.installmentPlans.length) return;
  const remainingPlans = [];
  state.installmentPlans.forEach((plan) => {
    const payment = Math.min(plan.dailyPayment, plan.remaining);
    if (payment > 0) {
      state.stats.cash += payment;
      state.stats.revenueToday += payment;
      recordLedgerEvent({
        name: "Installment Payment",
        detail: plan.patientName,
        amount: payment,
        tag: "Receivable",
      });
    }
    plan.remaining = Math.max(0, plan.remaining - payment);
    plan.daysRemaining = Math.max(0, plan.daysRemaining - 1);
    if (plan.remaining <= 0) {
      logEvent(`${plan.patientName} completed their installment plan.`, "positive");
    } else {
      remainingPlans.push(plan);
    }
  });
  state.installmentPlans = remainingPlans;
  updateFinancePanels();
};

const getBlueprint = (roomType) => roomCatalog.find((room) => room.id === roomType);

const getRoomById = (roomId) => state.rooms.find((room) => room.id === roomId);

const highlightBuildSelection = (roomId) => {
  if (!elements.buildOptions) return;
  elements.buildOptions.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.room === roomId);
  });
};

const updateDesignerSummary = () => {
  if (!elements.designer.summary) return;
  const { summary, apply } = elements.designer;
  const blueprint = designerState.blueprint;
  if (!blueprint) {
    summary.innerHTML = "<p>Select a room blueprint to begin designing.</p>";
    designerState.preview = null;
    if (apply) {
      apply.disabled = true;
      apply.textContent = "Apply design to selected room";
    }
    return;
  }

  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: designerState.sizeId,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });
  designerState.preview = preview;

  const severityBase = blueprint.baseSeverity ?? 0;
  const severityCapacity = Math.max(0, Math.round(severityBase + preview.severityBoost));

  const layoutLine = document.createElement("div");
  layoutLine.innerHTML = `<strong>Layout:</strong> ${preview.sizeOption.label} • Theme ${preview.interior.label}`;
  const costLine = document.createElement("div");
  costLine.innerHTML = `<strong>Total Build Cost:</strong> ¤${formatCurrency(preview.totalCost)}`;
  const upkeepLine = document.createElement("div");
  upkeepLine.innerHTML = `<strong>Daily Upkeep:</strong> ¤${formatCurrency(preview.upkeep)}`;
  const machineLine = document.createElement("div");
  const machineNames = preview.machines.map((machine) => machine.label).join(", ");
  machineLine.innerHTML = `<strong>Equipment:</strong> ${machineNames || "Baseline kit"}`;
  const decorLine = document.createElement("div");
  const decorNames = preview.decorations.map((decor) => decor.label).join(", ");
  decorLine.innerHTML = `<strong>Decor:</strong> ${decorNames || "None"}`;

  summary.innerHTML = "";
  summary.append(layoutLine, costLine, upkeepLine, machineLine, decorLine);

  const amenityDefs = preview.decorations.filter((decor) => decor.amenityType);
  if (amenityDefs.length) {
    const amenityLine = document.createElement("div");
    const amenityNames = [...new Set(amenityDefs.map((decor) => decor.amenityLabel ?? decor.label))];
    amenityLine.innerHTML = `<strong>Amenities:</strong> ${amenityNames.join(", ")}`;
    summary.appendChild(amenityLine);
  }
  const plantCount = preview.decorations.filter((decor) => decor.isPlant).length;
  if (plantCount) {
    const plantLine = document.createElement("div");
    plantLine.innerHTML = `<strong>Plants:</strong> ${plantCount} cared feature${plantCount > 1 ? "s" : ""}`;
    summary.appendChild(plantLine);
  }

  if (severityBase > 0) {
    const severityLine = document.createElement("div");
    severityLine.innerHTML = `<strong>Treatment Capacity:</strong> Severity ${severityCapacity}`;
    summary.appendChild(severityLine);
  }

  const ambienceLine = document.createElement("div");
  const env = preview.environmentBoost.toFixed(1);
  const welfare = preview.welfareBoost.toFixed(1);
  const morale = preview.moraleBoost.toFixed(1);
  const reputation = preview.reputationBoost.toFixed(1);
  ambienceLine.innerHTML = `<strong>Ambience Boosts:</strong> Env +${env}, Welfare +${welfare}, Morale +${morale}, Rep +${reputation}`;
  summary.appendChild(ambienceLine);

  if (designerState.editingRoomId) {
    const room = getRoomById(designerState.editingRoomId);
    if (room) {
      const baselineCost = room.costInvested ?? Math.round(room.baseCost ?? blueprint.cost);
      const delta = preview.totalCost - baselineCost;
      const deltaLine = document.createElement("div");
      if (delta > 0) {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> ¤${formatCurrency(delta)}`;
      } else if (delta < 0) {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> none (layout savings reinvested)`;
      } else {
        deltaLine.innerHTML = `<strong>Upgrade Cost:</strong> none`;
      }
      summary.prepend(deltaLine);
    }
  }

  if (apply) {
    apply.disabled = !designerState.editingRoomId;
    apply.textContent = designerState.editingRoomId
      ? "Apply design to room"
      : "Apply design to selected room";
  }
};

const updateDesignerOptions = () => {
  const blueprint = designerState.blueprint;
  const { size, theme, machines, decor } = elements.designer;
  if (!size || !theme || !machines || !decor) return;

  if (!blueprint) {
    size.innerHTML = "<option value=\"\">Select a room</option>";
    theme.innerHTML = "";
    machines.innerHTML = "<p>Select a room to view equipment.</p>";
    decor.innerHTML = "";
    updateDesignerSummary();
    return;
  }

  const profile = blueprint.designProfile ?? defaultDesignProfile;

  if (!profile.sizes.includes(designerState.sizeId)) {
    designerState.sizeId = profile.sizes[0];
  }
  size.innerHTML = "";
  profile.sizes.forEach((id) => {
    const option = document.createElement("option");
    const sizeOption = getSizeOption(id);
    option.value = id;
    option.textContent = `${sizeOption.label} (¤${formatCurrency(Math.round(blueprint.cost * sizeOption.costMultiplier))})`;
    size.appendChild(option);
  });
  size.value = designerState.sizeId;

  if (!profile.interiors.includes(designerState.interiorId)) {
    designerState.interiorId = profile.interiors[0];
  }
  theme.innerHTML = "";
  profile.interiors.forEach((id) => {
    const option = document.createElement("option");
    const interior = getInteriorTheme(id);
    option.value = id;
    option.textContent = `${interior.label} (¤${formatCurrency(interior.cost)})`;
    theme.appendChild(option);
  });
  theme.value = designerState.interiorId;

  machines.innerHTML = "";
  const machineIds = profile.machines.length ? profile.machines : ["standard-kit"];
  const baselineOnly = machineIds.every((id) => id === "standard-kit");
  if (baselineOnly) {
    designerState.machines = new Set(["standard-kit"]);
    const note = document.createElement("p");
    note.textContent = "Baseline kit installed. No specialist machines available for this room.";
    machines.appendChild(note);
  } else {
    machineIds.forEach((id) => {
      const def = getMachineDefinition(id);
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = id;
      checkbox.checked = designerState.machines.has(id);
      if (id === "standard-kit") {
        checkbox.disabled = true;
        designerState.machines.add(id);
      }
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          designerState.machines.add(id);
        } else {
          designerState.machines.delete(id);
          if (!designerState.machines.size) {
            designerState.machines.add("standard-kit");
          }
        }
        updateDesignerSummary();
      });
      const text = document.createElement("span");
      const details = [];
      if (def.severityBoost) {
        details.push(`+${def.severityBoost} severity`);
      }
      if (def.welfareBoost) {
        details.push(`+${def.welfareBoost} welfare`);
      }
      text.textContent = `${def.label} – ¤${formatCurrency(def.cost)}${
        details.length ? ` (${details.join(", ")})` : ""
      }`;
      label.append(checkbox, text);
      machines.appendChild(label);
    });
  }

  decor.innerHTML = "";
  profile.decor.forEach((id) => {
    const def = getDecorationDefinition(id);
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = id;
    checkbox.checked = designerState.decorations.has(id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        designerState.decorations.add(id);
      } else {
        designerState.decorations.delete(id);
      }
      updateDesignerSummary();
    });
    const text = document.createElement("span");
    const details = [];
    if (def.environment) {
      details.push(`Env +${def.environment}`);
    }
    if (def.welfare) {
      details.push(`Welfare +${def.welfare}`);
    }
    if (def.morale) {
      details.push(`Morale +${def.morale}`);
    }
    if (def.reputation) {
      details.push(`Rep +${def.reputation}`);
    }
    if (def.amenityLabel) {
      details.push(def.amenityLabel);
    }
    if (def.isPlant) {
      details.push("Plant");
    }
    text.textContent = `${def.label} – ¤${formatCurrency(def.cost)}${
      details.length ? ` (${details.join(", ")})` : ""
    }`;
    label.append(checkbox, text);
    decor.appendChild(label);
  });

  updateDesignerSummary();
};

const setDesignerBlueprint = (blueprint, { resetSelections = true, editing = false } = {}) => {
  designerState.blueprint = blueprint;
  if (!editing) {
    designerState.editingRoomId = null;
  }
  if (!blueprint) {
    updateDesignerOptions();
    return;
  }
  const profile = blueprint.designProfile ?? defaultDesignProfile;
  if (resetSelections) {
    designerState.sizeId = profile.sizes[0];
    designerState.interiorId = profile.interiors[0];
    designerState.machines = new Set(profile.defaultMachines ?? ["standard-kit"]);
    if (!designerState.machines.size) {
      designerState.machines.add("standard-kit");
    }
    designerState.decorations = new Set();
  } else {
    if (!profile.sizes.includes(designerState.sizeId)) {
      designerState.sizeId = profile.sizes[0];
    }
    if (!profile.interiors.includes(designerState.interiorId)) {
      designerState.interiorId = profile.interiors[0];
    }
    designerState.machines = new Set(
      Array.from(designerState.machines).filter((id) => profile.machines.includes(id))
    );
    if (!designerState.machines.size) {
      designerState.machines.add("standard-kit");
    }
    designerState.decorations = new Set(
      Array.from(designerState.decorations).filter((id) => profile.decor.includes(id))
    );
  }
  updateDesignerOptions();
};

const loadRoomIntoDesigner = (room) => {
  const blueprint = getBlueprint(room.type);
  if (!blueprint) return;
  designerState.editingRoomId = room.id;
  designerState.sizeId = room.sizeId ?? blueprint.designProfile?.sizes?.[0] ?? ROOM_SIZE_LIBRARY[0].id;
  designerState.interiorId = room.interiorId ?? blueprint.designProfile?.interiors?.[0] ?? ROOM_INTERIOR_LIBRARY[0].id;
  designerState.machines = new Set(room.machines?.length ? room.machines : blueprint.designProfile?.defaultMachines ?? ["standard-kit"]);
  if (!designerState.machines.size) {
    designerState.machines.add("standard-kit");
  }
  designerState.decorations = new Set(room.decorations ?? []);
  selectedRoom = blueprint;
  setDesignerBlueprint(blueprint, { resetSelections: false, editing: true });
  highlightBuildSelection(blueprint.id);
  updateBuildGuidance();
  renderRoomManagement();
};

const canPlaceFootprint = (x, y, width, height, ignoreRoom = null) => {
  if (x + width > GRID_WIDTH || y + height > GRID_HEIGHT) return false;
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!isTileUnlocked(x + dx, y + dy)) {
        return false;
      }
      const occupant = state.grid[y + dy][x + dx];
      if (occupant && (!ignoreRoom || occupant.id !== ignoreRoom.id)) {
        return false;
      }
    }
  }
  return true;
};

const clearRoomFootprint = (room, width = room.width, height = room.height) => {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (state.grid[room.y + dy] && state.grid[room.y + dy][room.x + dx] === room) {
        state.grid[room.y + dy][room.x + dx] = null;
      }
    }
  }
};

const occupyRoomFootprint = (room) => {
  for (let dy = 0; dy < room.height; dy++) {
    for (let dx = 0; dx < room.width; dx++) {
      if (state.grid[room.y + dy]) {
        state.grid[room.y + dy][room.x + dx] = room;
      }
    }
  }
};

const hasPlacementForSize = (width, height, ignoreRoom = null) => {
  for (let y = 0; y <= GRID_HEIGHT - height; y++) {
    for (let x = 0; x <= GRID_WIDTH - width; x++) {
      if (canPlaceFootprint(x, y, width, height, ignoreRoom)) {
        return true;
      }
    }
  }
  return false;
};

const recalculateAmbience = () => {
  const totals = state.rooms.reduce(
    (acc, room) => {
      acc.environment += room.environmentBoost ?? 0;
      acc.welfare += room.welfareBoost ?? 0;
      acc.morale += room.moraleBoost ?? 0;
      acc.reputation += room.reputationBoost ?? 0;
      return acc;
    },
    { environment: 0, welfare: 0, morale: 0, reputation: 0 }
  );
  state.ambience = totals;
  const snackComfort = getTotalAmenityCount("snack") * 0.5 + getTotalAmenityCount("hydration") * 0.4;
  const groundsPenalty = Math.max(0, (100 - state.stats.grounds) / 12 + (state.litter ?? 0) * 0.5);
  const plantBonus = (state.stats.plantCare - 70) / 10 + getTotalPlants() * 0.1;
  state.stats.environmentScore = clamp(55 + totals.environment * 6 + plantBonus - groundsPenalty, 0, 100);
  state.stats.welfareScore = clamp(55 + totals.welfare * 6 + snackComfort - groundsPenalty * 0.5, 0, 100);
};

const renderRoomManagement = () => {
  if (!elements.builtRooms) return;
  elements.builtRooms.innerHTML = "";
  if (!state.rooms.length) {
    const empty = document.createElement("li");
    empty.textContent = "No rooms constructed yet.";
    elements.builtRooms.appendChild(empty);
    return;
  }
  state.rooms.forEach((room) => {
    const blueprint = getBlueprint(room.type);
    const theme = getInteriorTheme(room.interiorId);
    const li = document.createElement("li");
    if (designerState.editingRoomId === room.id) {
      li.classList.add("active");
    }
    const header = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = blueprint?.name ?? room.type;
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit layout";
    editButton.addEventListener("click", () => loadRoomIntoDesigner(room));
    header.append(title, editButton);
    li.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "built-room-meta";
    const sizeSpan = document.createElement("span");
    sizeSpan.textContent = `${room.width}×${room.height}`;
    const themeSpan = document.createElement("span");
    themeSpan.textContent = theme.label;
    const costSpan = document.createElement("span");
    costSpan.textContent = `Cost ¤${formatCurrency(room.costInvested ?? blueprint?.cost ?? 0)}`;
    const upkeepSpan = document.createElement("span");
    upkeepSpan.textContent = `Upkeep ¤${formatCurrency(room.upkeep ?? blueprint?.upkeep ?? 0)}`;
    const machinesSpan = document.createElement("span");
    machinesSpan.textContent = `Equipment ${room.machines?.length ?? 0}`;
    const decorSpan = document.createElement("span");
    decorSpan.textContent = `Decor ${room.decorations?.length ?? 0}`;
    meta.append(sizeSpan, themeSpan, costSpan, upkeepSpan, machinesSpan, decorSpan);
    li.appendChild(meta);

    const effects = document.createElement("div");
    effects.className = "built-room-effects";
    if (room.severityCapacity) {
      const severityTag = document.createElement("span");
      severityTag.textContent = `Severity ${room.severityCapacity}`;
      effects.appendChild(severityTag);
    }
    if (room.environmentBoost) {
      const envTag = document.createElement("span");
      envTag.textContent = `Env +${room.environmentBoost.toFixed(1)}`;
      effects.appendChild(envTag);
    }
    if (room.welfareBoost) {
      const welfareTag = document.createElement("span");
      welfareTag.textContent = `Welfare +${room.welfareBoost.toFixed(1)}`;
      effects.appendChild(welfareTag);
    }
    if (room.moraleBoost) {
      const moraleTag = document.createElement("span");
      moraleTag.textContent = `Morale +${room.moraleBoost.toFixed(1)}`;
      effects.appendChild(moraleTag);
    }
    if (room.reputationBoost) {
      const repTag = document.createElement("span");
      repTag.textContent = `Rep +${room.reputationBoost.toFixed(1)}`;
      effects.appendChild(repTag);
    }
    if (effects.children.length) {
      li.appendChild(effects);
    }

    const decorDefs = (room.decorations ?? []).map(getDecorationDefinition);
    const amenityDefs = decorDefs.filter((def) => def?.amenityType);
    if (amenityDefs.length) {
      const amenities = document.createElement("div");
      amenities.className = "built-room-amenities";
      [...new Set(amenityDefs.map((def) => def.amenityLabel ?? def.label))].forEach((label) => {
        const badge = document.createElement("span");
        badge.textContent = label;
        amenities.appendChild(badge);
      });
      li.appendChild(amenities);
    }
    const plantCount = decorDefs.filter((def) => def?.isPlant).length;
    if (plantCount) {
      const plants = document.createElement("div");
      plants.className = "built-room-amenities plant";
      const badge = document.createElement("span");
      badge.textContent = `${plantCount} plant${plantCount > 1 ? "s" : ""}`;
      plants.appendChild(badge);
      li.appendChild(plants);
    }

    elements.builtRooms.appendChild(li);
  });
};

const applyDesignToRoom = () => {
  if (!designerState.editingRoomId) return;
  const room = getRoomById(designerState.editingRoomId);
  if (!room) return;
  const blueprint = getBlueprint(room.type);
  if (!blueprint) return;
  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: designerState.sizeId,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });

  const newWidth = preview.sizeOption.width;
  const newHeight = preview.sizeOption.height;
  if (!canPlaceFootprint(room.x, room.y, newWidth, newHeight, room)) {
    logEvent("Not enough free space around this room to apply the new layout.", "negative");
    return;
  }

  const previousCost = room.costInvested ?? Math.round(room.baseCost ?? blueprint.cost);
  const delta = preview.totalCost - previousCost;
  if (delta > 0 && state.stats.cash < delta) {
    logEvent(
      `Upgrading ${blueprint.name} requires ¤${formatCurrency(delta)} more funds.`,
      "negative"
    );
    return;
  }

  const oldWidth = room.width;
  const oldHeight = room.height;
  const previousReputationBoost = room.reputationBoost ?? 0;
  clearRoomFootprint(room, oldWidth, oldHeight);
  room.width = newWidth;
  room.height = newHeight;
  room.sizeId = preview.sizeOption.id;
  room.interiorId = designerState.interiorId;
  room.machines = machines;
  room.decorations = decorations;
  room.costInvested = preview.totalCost;
  room.upkeep = preview.upkeep;
  room.severityBoost = preview.severityBoost;
  room.environmentBoost = preview.environmentBoost;
  room.welfareBoost = preview.welfareBoost;
  room.moraleBoost = preview.moraleBoost;
  room.reputationBoost = preview.reputationBoost;
  room.severityCapacity = Math.max(0, Math.round((blueprint.baseSeverity ?? 0) + preview.severityBoost));
  room.roleRequired = blueprint.roleRequired;
  occupyRoomFootprint(room);

  state.stats.reputation = clamp(
    state.stats.reputation + (preview.reputationBoost - previousReputationBoost),
    0,
    100
  );

  if (delta > 0) {
    state.stats.cash -= delta;
    state.stats.expensesToday += delta;
    logEvent(`${blueprint.name} upgraded for ¤${formatCurrency(delta)}.`, "positive");
  } else if (delta < 0) {
    logEvent(`${blueprint.name} redesign applied with no extra spend.`, "positive");
  } else {
    logEvent(`${blueprint.name} design refreshed.`, "positive");
  }

  renderRoomManagement();
  updateGrid();
  renderHospitalCanvas();
  recalculateAmbience();
  updateDesignerSummary();
  updateStats();
  updateBuildGuidance();
};

const setBuildMode = (active) => {
  if (!elements.grid) return;
  elements.grid.classList.toggle("is-building", active);
  if (elements.blueprintFootnote) {
    elements.blueprintFootnote.classList.toggle("active", active);
  }
};

const updateBuildGuidance = () => {
  if (!elements.buildHint) return;
  if (designerState.editingRoomId) {
    const room = getRoomById(designerState.editingRoomId);
    const blueprint = designerState.blueprint ?? (room ? getBlueprint(room.type) : null);
    const sizeLabel = getSizeOption(designerState.sizeId).label;
    elements.buildHint.textContent = `Editing ${blueprint?.name ?? "room"} – ${sizeLabel}. Adjust options then press "Apply design to room".`;
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = `Design changes do not require clicking the grid. Apply the update when you are happy with the layout or press Esc to cancel.`;
    }
    setBuildMode(false);
    return;
  }

  const blueprint = selectedRoom ?? designerState.blueprint;
  setBuildMode(Boolean(blueprint));
  if (blueprint) {
    const size = getSizeOption(designerState.sizeId);
    const theme = getInteriorTheme(designerState.interiorId);
    let hint = `Building: ${blueprint.name} – ${size.label}, ${theme.label}. Click the top-left tile to place it.`;
    let footnote = `Layout covers ${size.width}×${size.height} tiles. Select the top-left plot or press Esc to cancel.`;
    if (!hasPlacementForSize(size.width, size.height)) {
      const availableParcel = state.properties.find((parcel) => !parcel.owned);
      const parcelPrompt = availableParcel
        ? `Purchase ${availableParcel.name} from Hospital Grounds to unlock more space.`
        : "Adjust or relocate an existing room to free up space.";
      hint = `No free ${size.width}×${size.height} area for ${blueprint.name}. ${parcelPrompt}`;
      footnote = `Expand the campus or clear space before placing ${blueprint.name}.`;
    }
    elements.buildHint.textContent = hint;
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = footnote;
    }
  } else {
    elements.buildHint.textContent = "Select a room type above to begin construction.";
    if (elements.blueprintFootnote) {
      elements.blueprintFootnote.textContent = "Pick a room on the Build tab to start construction.";
    }
  }
};

const clearBuildSelection = () => {
  selectedRoom = null;
  designerState.editingRoomId = null;
  designerState.blueprint = null;
  designerState.machines = new Set(["standard-kit"]);
  designerState.decorations = new Set();
  updateBuildGuidance();
  updateDesignerSummary();
  updateDesignerOptions();
  renderRoomManagement();
  if (elements.buildOptions) {
    elements.buildOptions
      .querySelectorAll("button")
      .forEach((btn) => btn.classList.remove("selected"));
  }
};

const renderBlueprintAxes = () => {
  if (!elements.axisX || !elements.axisY) return;
  elements.axisX.innerHTML = "";
  elements.axisY.innerHTML = "";
  for (let x = 0; x < GRID_WIDTH; x++) {
    const span = document.createElement("span");
    span.textContent = AXIS_LETTERS[x] ?? String(x + 1);
    elements.axisX.appendChild(span);
  }
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const span = document.createElement("span");
    span.textContent = String(y + 1);
    elements.axisY.appendChild(span);
  }
};

const setupGrid = () => {
  elements.grid.innerHTML = "";
  renderBlueprintAxes();
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = document.createElement("button");
      cell.className = "grid-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.x = x;
      cell.dataset.y = y;
      const coordLabel = `${AXIS_LETTERS[x] ?? x + 1}${y + 1}`;
      cell.dataset.coord = coordLabel;
      cell.setAttribute("aria-label", `Plot ${coordLabel}`);
      cell.title = `Plot ${coordLabel}`;
      const parcel = getParcelAt(x, y);
      if (parcel) {
        cell.dataset.parcelId = parcel.id;
        cell.dataset.parcelName = parcel.name;
      }
      cell.addEventListener("click", () => handleBuildClick(x, y));
      elements.grid.appendChild(cell);
    }
  }
};

const updateGrid = () => {
  const cells = elements.grid.querySelectorAll(".grid-cell");
  cells.forEach((cell) => {
    const tileX = Number(cell.dataset.x);
    const tileY = Number(cell.dataset.y);
    const room = state.grid[tileY][tileX];
    const coord = cell.dataset.coord;
    const parcel = getParcelAt(tileX, tileY);
    const unlocked = isTileUnlocked(tileX, tileY);
    cell.classList.toggle("locked", !unlocked);
    if (!unlocked) {
      cell.classList.remove("room");
      cell.dataset.label = "";
      cell.dataset.origin = "false";
      cell.dataset.size = "";
      cell.textContent = "";
      cell.disabled = true;
      cell.dataset.status = "locked";
      cell.dataset.parcelName = parcel?.name ?? "";
      const parcelLabel = parcel ? `${parcel.name} – locked` : "Unzoned land";
      cell.setAttribute("aria-label", `Plot ${coord} (${parcelLabel})`);
      return;
    }
    cell.disabled = false;
    cell.dataset.status = "";
    cell.dataset.parcelName = parcel?.name ?? "";
    if (room) {
      const blueprint = getBlueprint(room.type);
      const label = blueprint?.name ?? room.type;
      const isOrigin = tileX === room.x && tileY === room.y;
      cell.classList.add("room");
      cell.dataset.label = label;
      cell.dataset.origin = isOrigin ? "true" : "false";
      cell.dataset.size = `${room.width}x${room.height}`;
      cell.textContent = "";
      const theme = getInteriorTheme(room.interiorId);
      if (isOrigin) {
        cell.setAttribute(
          "aria-label",
          `Plot ${coord} – ${label} (${room.width}×${room.height}, ${theme.label})`
        );
      } else {
        cell.setAttribute("aria-label", `Plot ${coord} – ${label} footprint`);
      }
    } else {
      cell.classList.remove("room");
      cell.dataset.label = "";
      cell.dataset.origin = "false";
      cell.dataset.size = "";
      cell.textContent = "";
      cell.setAttribute("aria-label", `Plot ${coord} (empty)`);
    }
  });
};

const setupCanvas = () => {
  if (!elements.hospitalCanvas) return;
  const canvas = elements.hospitalCanvas;
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
  const scale = window.devicePixelRatio || 1;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.maxWidth = `${width}px`;
  hospitalCtx = canvas.getContext("2d");
  hospitalCtx.setTransform(1, 0, 0, 1, 0, 0);
  hospitalCtx.scale(scale, scale);
  invalidateCanvasCache();
};

const drawPatientQueue = (ctx) => {
  const baseY = GRID_HEIGHT * CANVAS_CELL - 26;
  const startX = 36;
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.6)";
  ctx.shadowBlur = 12;
  drawRoundedRect(ctx, startX - 24, baseY - 42, 480, 52, 18);
  ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillText("Patient Queue", startX - 12, baseY - 18);
  state.queue.slice(0, 10).forEach((patient, index) => {
    const px = startX + index * 44;
    const gradient = ctx.createRadialGradient(px - 2, baseY - 4, 4, px, baseY, 18);
    gradient.addColorStop(0, withAlpha(patient.profile.color, 0.95));
    gradient.addColorStop(1, withAlpha(shiftColor(patient.profile.color, -0.35), 0.85));
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    drawRoundedRect(ctx, px - 18, baseY - 18, 36, 36, 14);
    ctx.fill();
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, px - 14, baseY - 14, 28, 28, 12);
    ctx.fill();
    if (patient.isEmergency) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(patient.name.charAt(0), px, baseY + 4);
  });
  ctx.restore();
};

const drawRoomAura = (ctx, room) => {
  const theme = getInteriorTheme(room.interiorId);
  const visual = roomVisuals[room.type];
  const accent =
    theme.palette?.accent ??
    theme.palette?.mid ??
    visual?.color ??
    "#38bdf8";
  const centerX = (room.x + room.width / 2) * CANVAS_CELL;
  const centerY = (room.y + room.height / 2) * CANVAS_CELL;
  const radius = Math.max(room.width, room.height) * CANVAS_CELL * 0.9;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(CANVAS_CELL * 0.35, radius * 0.25),
    centerX,
    centerY,
    radius
  );
  aura.addColorStop(0, withAlpha(accent, 0.45));
  aura.addColorStop(0.6, withAlpha(shiftColor(accent, -0.1), 0.18));
  aura.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = aura;
  ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();

  const ringRadius = Math.max(room.width, room.height) * CANVAS_CELL * 0.45;
  if (ringRadius > CANVAS_CELL * 0.6) {
    ctx.save();
    ctx.strokeStyle = withAlpha(accent, 0.28);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

const drawRoomVitals = (ctx, room) => {
  const metrics = [];
  if (room.environmentBoost) {
    metrics.push({ label: "Env", value: room.environmentBoost, color: "#4ade80" });
  }
  if (room.welfareBoost) {
    metrics.push({ label: "Wlf", value: room.welfareBoost, color: "#facc15" });
  }
  if (room.reputationBoost) {
    metrics.push({ label: "Rep", value: room.reputationBoost, color: "#38bdf8" });
  }
  if (!metrics.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const width = room.width * CANVAS_CELL;
  const capsuleHeight = 16;
  const defaultY = originY + 34;
  const maxY = originY + room.height * CANVAS_CELL - capsuleHeight - 6;
  const baseY = Math.min(defaultY, maxY);
  const capsuleWidth = 44;
  const spacing = 6;
  const totalWidth = metrics.length * capsuleWidth + (metrics.length - 1) * spacing;
  let startX = originX + Math.max(6, (width - totalWidth) / 2);
  ctx.save();
  metrics.forEach((metric) => {
    const gradient = ctx.createLinearGradient(startX, baseY, startX, baseY + capsuleHeight);
    gradient.addColorStop(0, withAlpha(shiftColor(metric.color, 0.3), 0.9));
    gradient.addColorStop(1, withAlpha(shiftColor(metric.color, -0.25), 0.85));
    ctx.shadowColor = withAlpha(metric.color, 0.4);
    ctx.shadowBlur = 8;
    drawRoundedRect(ctx, startX, baseY, capsuleWidth, capsuleHeight, 7);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(metric.color, 0.65);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.font = "9px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${metric.label} +${Math.round(metric.value)}`, startX + capsuleWidth / 2, baseY + 11);
    startX += capsuleWidth + spacing;
  });
  ctx.restore();
};

const drawRoomMachines = (ctx, room) => {
  if (!room.machines?.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const totalWidth = room.width * CANVAS_CELL;
  const baseY = originY + room.height * CANVAS_CELL - 18;
  const iconSize = 10;
  const count = room.machines.length;
  const spacing = count > 1 ? Math.min(24, (totalWidth - 20) / (count - 1)) : 0;
  const startX = originX + 10;
  room.machines.forEach((id, index) => {
    const def = getMachineDefinition(id);
    const x = startX + index * spacing;
    const gradient = ctx.createLinearGradient(x, baseY, x + iconSize, baseY + iconSize);
    gradient.addColorStop(0, shiftColor(def.color, 0.3));
    gradient.addColorStop(0.6, def.color);
    gradient.addColorStop(1, shiftColor(def.color, -0.25));
    ctx.save();
    ctx.shadowColor = withAlpha(def.color, 0.6);
    ctx.shadowBlur = 6;
    drawRoundedRect(ctx, x, baseY, iconSize, iconSize, 3);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    ctx.strokeStyle = withAlpha("#0f172a", 0.65);
    ctx.stroke();
    ctx.restore();
  });

  if (room.severityCapacity) {
    ctx.save();
    drawRoundedRect(ctx, originX + 8, originY + 8, 40, 18, 6);
    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fill();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.25)";
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`S${room.severityCapacity}`, originX + 28, originY + 20);
    ctx.restore();
  }
};

const drawRoomDecor = (ctx, room) => {
  if (!room.decorations?.length) return;
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const baseX = originX + room.width * CANVAS_CELL - 16;
  const maxY = originY + room.height * CANVAS_CELL - 16;
  room.decorations.slice(0, 4).forEach((id, index) => {
    const def = getDecorationDefinition(id);
    const y = originY + 14 + index * 14;
    if (y > maxY) return;
    const accent = shiftColor(def.color, 0.35);
    const gradient = ctx.createRadialGradient(baseX - 2, y - 2, 2, baseX, y, 8);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, shiftColor(def.color, -0.35));
    ctx.save();
    ctx.shadowColor = withAlpha(def.color, 0.5);
    ctx.shadowBlur = 8;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(baseX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha("#0f172a", 0.5);
    ctx.stroke();
    ctx.restore();
  });
};

const drawRoomLabel = (ctx, room) => {
  const blueprint = getBlueprint(room.type);
  const label = blueprint?.name ?? room.type;
  const theme = getInteriorTheme(room.interiorId);
  const accent = theme.palette?.accent ?? "#38bdf8";
  const originX = room.x * CANVAS_CELL;
  const originY = room.y * CANVAS_CELL;
  const width = room.width * CANVAS_CELL;
  ctx.save();
  drawRoundedRect(ctx, originX + 10, originY + 6, width - 20, 22, 8);
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.65);
  ctx.stroke();
  ctx.fillStyle = "rgba(248, 250, 252, 0.92)";
  ctx.font = "11px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, originX + width / 2, originY + 21);
  ctx.restore();
};

const renderHospitalCanvas = () => {
  if (!hospitalCtx) return;
  const width = GRID_WIDTH * CANVAS_CELL;
  const height = GRID_HEIGHT * CANVAS_CELL;
  hospitalCtx.clearRect(0, 0, width, height);
  const blueprintLayer = getBlueprintBuffer(width, height);
  hospitalCtx.drawImage(blueprintLayer, 0, 0);

  const emptyTile = getEmptyTileSprite();
  const lockedTile = getLockedTileSprite();
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const px = x * CANVAS_CELL;
      const py = y * CANVAS_CELL;
      if (!isTileUnlocked(x, y)) {
        hospitalCtx.drawImage(lockedTile, px, py);
        continue;
      }
      const room = state.grid[y][x];
      if (room) {
        const visualKey = roomVisuals[room.type] ? room.type : "default";
        const visual = roomVisuals[visualKey] ?? roomVisuals.default;
        const theme = getInteriorTheme(room.interiorId);
        const sprite = getRoomTileSprite(theme, visualKey, visual);
        hospitalCtx.drawImage(sprite, px, py);
      } else {
        hospitalCtx.drawImage(emptyTile, px, py);
      }
    }
  }

  state.properties.forEach((parcel) => {
    const px = parcel.x * CANVAS_CELL;
    const py = parcel.y * CANVAS_CELL;
    const w = parcel.width * CANVAS_CELL;
    const h = parcel.height * CANVAS_CELL;
    hospitalCtx.save();
    if (parcel.owned) {
      hospitalCtx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      hospitalCtx.lineWidth = 3;
      hospitalCtx.setLineDash([10, 6]);
      hospitalCtx.strokeRect(px + 2, py + 2, w - 4, h - 4);
    } else {
      const overlay = hospitalCtx.createLinearGradient(px, py, px + w, py + h);
      overlay.addColorStop(0, "rgba(30, 64, 175, 0.45)");
      overlay.addColorStop(1, "rgba(15, 23, 42, 0.7)");
      hospitalCtx.fillStyle = overlay;
      hospitalCtx.fillRect(px + 2, py + 2, w - 4, h - 4);
      hospitalCtx.strokeStyle = "rgba(148, 197, 255, 0.55)";
      hospitalCtx.lineWidth = 3;
      hospitalCtx.setLineDash([12, 6]);
      hospitalCtx.strokeRect(px + 2, py + 2, w - 4, h - 4);
      hospitalCtx.fillStyle = "rgba(191, 219, 254, 0.85)";
      hospitalCtx.font = "14px 'Segoe UI', sans-serif";
      hospitalCtx.textAlign = "center";
      hospitalCtx.fillText("For Sale", px + w / 2, py + h / 2);
    }
    hospitalCtx.restore();
  });

  state.rooms.forEach((room) => {
    drawRoomAura(hospitalCtx, room);
  });

  state.rooms.forEach((room) => {
    const theme = getInteriorTheme(room.interiorId);
    hospitalCtx.save();
    hospitalCtx.strokeStyle = withAlpha(theme.palette?.accent ?? "#94a3b8", 0.9);
    hospitalCtx.lineWidth = 2.5;
    hospitalCtx.shadowColor = withAlpha(theme.palette?.accent ?? "#94a3b8", 0.35);
    hospitalCtx.shadowBlur = 8;
    hospitalCtx.strokeRect(
      room.x * CANVAS_CELL + 3,
      room.y * CANVAS_CELL + 3,
      room.width * CANVAS_CELL - 6,
      room.height * CANVAS_CELL - 6
    );
    hospitalCtx.restore();
    drawRoomMachines(hospitalCtx, room);
    drawRoomDecor(hospitalCtx, room);
    drawRoomLabel(hospitalCtx, room);
    drawRoomVitals(hospitalCtx, room);
  });

  drawPatientQueue(hospitalCtx);
};

const updateStats = () => {
  const {
    day,
    cash,
    reputation,
    patientsTreated,
    cleanliness,
    efficiency,
    morale,
    grounds,
    plantCare,
    environmentScore,
    welfareScore,
  } = state.stats;
  elements.statDay.textContent = day;
  elements.statCash.textContent = formatCurrency(cash);
  elements.statReputation.textContent = reputation;
  elements.statTreated.textContent = patientsTreated;
  elements.meters.cleanliness.value = cleanliness;
  elements.meters.efficiency.value = efficiency;
  elements.meters.morale.value = morale;
  if (elements.meters.grounds) {
    elements.meters.grounds.value = grounds;
  }
  if (elements.meters.plant) {
    elements.meters.plant.value = plantCare;
  }
  if (elements.statEnvironment) {
    elements.statEnvironment.textContent = Math.round(environmentScore);
  }
  if (elements.statWelfare) {
    elements.statWelfare.textContent = Math.round(welfareScore);
  }
  updatePropertyPurchaseButtons();
};

const updateQueue = () => {
  elements.patientQueue.innerHTML = "";
  state.queue.forEach((patient) => {
    const li = document.createElement("li");
    if (patient.isEmergency) {
      li.classList.add("emergency");
    }
    const header = document.createElement("div");
    header.className = "queue-header";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = patient.name;
    const ailmentSpan = document.createElement("span");
    ailmentSpan.textContent = patient.ailment.name;
    header.append(nameSpan, ailmentSpan);

    const meta = document.createElement("div");
    meta.className = "queue-meta";

    const profileBadge = document.createElement("span");
    profileBadge.className = "queue-badge";
    profileBadge.textContent = patient.profile.label;
    profileBadge.style.color = patient.profile.color;
    meta.appendChild(profileBadge);

    if (patient.isEmergency) {
      const emergencyBadge = document.createElement("span");
      emergencyBadge.className = "queue-badge";
      emergencyBadge.textContent = "Emergency";
      emergencyBadge.style.color = "#ef4444";
      meta.appendChild(emergencyBadge);
    }

    const patience = document.createElement("span");
    patience.textContent = `Patience ${Math.max(0, Math.round(patient.patience))}`;
    meta.appendChild(patience);

    const estimate = document.createElement("span");
    const preview = getBillingPreview(patient);
    estimate.textContent = `Charge ¤${formatCurrency(preview.charge)} • ${preview.methodLabel}`;
    const tooltipParts = [`Immediate ¤${formatCurrency(preview.netCash)}`];
    if (preview.receivable) {
      tooltipParts.push(`Deferred ¤${formatCurrency(preview.receivable)}`);
    }
    if (preview.financeFee) {
      tooltipParts.push(`Fee ¤${formatCurrency(preview.financeFee)}`);
    }
    estimate.title = tooltipParts.join(" • ");
    meta.appendChild(estimate);

    li.append(header, meta);
    elements.patientQueue.appendChild(li);
  });
  renderHospitalCanvas();
};

const updateObjectives = () => {
  elements.objectives.innerHTML = "";
  state.objectives.forEach((obj) => {
    const li = document.createElement("li");
    li.textContent = obj.text;
    if (obj.completed) {
      li.classList.add("completed");
      li.textContent += " ✔";
    }
    elements.objectives.appendChild(li);
  });
};

const describeParcelSize = (parcel) => `${parcel.width}×${parcel.height} tiles`;

const renderOwnedProperties = () => {
  if (!elements.property?.owned) return;
  const list = elements.property.owned;
  list.innerHTML = "";
  const owned = getOwnedProperties();
  if (!owned.length) {
    const empty = document.createElement("li");
    empty.textContent = "No parcels owned.";
    list.appendChild(empty);
    return;
  }
  owned.forEach((parcel) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${parcel.name}</strong><span>${describeParcelSize(parcel)}</span>`;
    list.appendChild(item);
  });
};

const renderPropertyMarket = () => {
  if (!elements.property?.market) return;
  const market = elements.property.market;
  market.innerHTML = "";
  const forSale = state.properties.filter((parcel) => !parcel.owned);
  if (!forSale.length) {
    const done = document.createElement("p");
    done.className = "property-complete";
    done.textContent = "All grounds have been purchased.";
    market.appendChild(done);
    return;
  }
  forSale.forEach((parcel) => {
    const card = document.createElement("article");
    card.className = "property-card";
    const heading = document.createElement("header");
    heading.innerHTML = `<h4>${parcel.name}</h4><span>${describeParcelSize(parcel)}</span>`;
    const body = document.createElement("p");
    body.textContent = parcel.description;
    const cta = document.createElement("button");
    cta.type = "button";
    cta.textContent = `Purchase for ¤${formatCurrency(parcel.cost)}`;
    cta.dataset.parcelId = parcel.id;
    cta.disabled = state.stats.cash < parcel.cost;
    cta.addEventListener("click", () => purchaseProperty(parcel.id));
    card.append(heading, body, cta);
    market.appendChild(card);
  });
  updatePropertyPurchaseButtons();
};

const updatePropertyPurchaseButtons = () => {
  if (!elements.property?.market) return;
  elements.property.market.querySelectorAll("button[data-parcel-id]").forEach((button) => {
    const parcel = getPropertyById(button.dataset.parcelId);
    if (parcel) {
      button.disabled = parcel.owned || state.stats.cash < parcel.cost;
    }
  });
};

const purchaseProperty = (parcelId) => {
  const parcel = getPropertyById(parcelId);
  if (!parcel || parcel.owned) return;
  if (state.stats.cash < parcel.cost) {
    logEvent("Not enough cash to purchase that land parcel.", "negative");
    return;
  }
  parcel.owned = true;
  state.stats.cash -= parcel.cost;
  state.stats.expensesToday += parcel.cost;
  renderOwnedProperties();
  renderPropertyMarket();
  updateStats();
  updatePropertyPurchaseButtons();
  updateGrid();
  renderHospitalCanvas();
  updateBuildGuidance();
  const coord = `${AXIS_LETTERS[parcel.x] ?? parcel.x + 1}${parcel.y + 1}`;
  logEvent(
    `${parcel.name} purchased for ¤${formatCurrency(parcel.cost)}. New build area unlocks from ${coord}.`,
    "positive"
  );
};

const renderBuildOptions = () => {
  elements.buildOptions.innerHTML = "";
  roomCatalog.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.room = room.id;
    button.innerHTML = `
      <div>
        <strong>${room.name}</strong>
        <div class="details">${room.description}</div>
      </div>
      <div>
        ¤${formatCurrency(room.cost)}
      </div>
    `;
    button.addEventListener("click", () => {
      selectedRoom = room;
      setDesignerBlueprint(room, { resetSelections: true });
      highlightBuildSelection(room.id);
      updateBuildGuidance();
    });
    if (!designerState.editingRoomId && (selectedRoom?.id === room.id || designerState.blueprint?.id === room.id)) {
      button.classList.add("selected");
    }
    elements.buildOptions.appendChild(button);
  });
  if (!designerState.editingRoomId && designerState.blueprint) {
    highlightBuildSelection(designerState.blueprint.id);
  }
  updateBuildGuidance();
};

const randomFrom = (array) => array[Math.floor(Math.random() * array.length)];

const countStaffByRole = (role) => state.staff.filter((member) => member.role === role).length;

const hasRoomBuilt = (type) => state.rooms.some((room) => room.type === type);

const STAFF_ROLE_LABELS = {
  doctor: "Doctor",
  nurse: "Nurse",
  assistant: "Assistant",
  janitor: "Custodian",
  facility: "Facility Manager",
  researcher: "Researcher",
  marketer: "Marketer",
  surgeon: "Surgeon",
  technician: "Technician",
  accountant: "Accountant",
  midwife: "Midwife",
  therapist: "Therapist",
  entertainer: "Entertainer",
  security: "Security",
  dentist: "Dentist",
  chef: "Chef",
};

const formatStaffRole = (role) => STAFF_ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);

const getTotalAmenityCount = (amenityType) =>
  state.rooms.reduce((sum, room) => {
    if (!room.decorations?.length) return sum;
    const roomCount = room.decorations.reduce((acc, id) => {
      const def = getDecorationDefinition(id);
      return acc + (def.amenityType === amenityType ? 1 : 0);
    }, 0);
    return sum + roomCount;
  }, 0);

const getTotalPlants = () =>
  state.rooms.reduce((sum, room) => {
    if (!room.decorations?.length) return sum;
    const roomPlants = room.decorations.reduce((acc, id) => {
      const def = getDecorationDefinition(id);
      return acc + (def.isPlant ? 1 : 0);
    }, 0);
    return sum + roomPlants;
  }, 0);

const generateCandidate = () => {
  const blueprint = randomFrom(staffCatalog);
  const name = randomFrom(blueprint.namePool);
  const trait = randomFrom(blueprint.traits);
  const salary = Math.floor(
    blueprint.salary[0] + Math.random() * (blueprint.salary[1] - blueprint.salary[0])
  );
  return {
    id: staffIdCounter++,
    name,
    role: blueprint.role,
    trait,
    salary,
    morale: 80,
  };
};

const refreshCandidates = () => {
  state.candidates = Array.from({ length: 3 }, generateCandidate);
};

const renderCandidates = () => {
  elements.staffCandidates.innerHTML = "";
  const template = document.querySelector("#candidate-template");
  state.candidates.forEach((candidate) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = candidate.name;
    card.querySelector(".role").textContent = formatStaffRole(candidate.role);
    card.querySelector(".traits").textContent = `Trait: ${candidate.trait}`;
    card.querySelector(".cost").textContent = formatCurrency(candidate.salary);
    card.querySelector(".hire-button").addEventListener("click", () => hireStaff(candidate.id));
    elements.staffCandidates.appendChild(card);
  });
};

const renderRoster = () => {
  elements.staffRoster.innerHTML = "";
  state.staff.forEach((member) => {
    const li = document.createElement("li");
    const role = formatStaffRole(member.role);
    const morale = Math.round(member.morale);
    const trait = member.trait ? ` • Trait: ${member.trait}` : "";
    li.textContent = `${member.name} (${role}) • Morale ${morale}${trait}`;
    elements.staffRoster.appendChild(li);
  });
};

const renderProjects = () => {
  elements.researchProjects.innerHTML = "";
  const template = document.querySelector("#research-template");
  state.projects.forEach((project) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = project.name;
    card.querySelector(".desc").textContent = project.unlocked
      ? "Unlocked!"
      : project.desc;
    const progress = card.querySelector("progress");
    progress.value = project.progress;
    progress.max = 100;
    const button = card.querySelector(".invest-button");
    button.querySelector(".cost").textContent = formatCurrency(project.cost);
    button.disabled = project.unlocked;
    button.addEventListener("click", () => investResearch(project.id));
    elements.researchProjects.appendChild(card);
  });
};

const renderCampaigns = () => {
  elements.marketingCampaigns.innerHTML = "";
  const template = document.querySelector("#campaign-template");
  state.campaigns.forEach((campaign) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".name").textContent = campaign.name;
    card.querySelector(".desc").textContent = campaign.desc;
    const button = card.querySelector(".launch-button");
    button.querySelector(".cost").textContent = formatCurrency(campaign.cost);
    button.addEventListener("click", () => launchCampaign(campaign.id));
    elements.marketingCampaigns.appendChild(card);
  });
};

const renderBillingLedger = () => {
  if (!elements.billingLedger) return;
  elements.billingLedger.innerHTML = "";
  state.billingRecords.forEach((entry) => {
    const li = document.createElement("li");
    const amountClass = entry.amount >= 0 ? "positive" : "negative";
    if (entry.custom) {
      li.innerHTML = `
        <div class="ledger-row">
          <span>${entry.name}</span>
          <span class="amount ${amountClass}">¤${formatCurrency(entry.amount)}</span>
        </div>
        <div class="ledger-row">
          <span>${entry.detail ?? ""}</span>
          <span>${entry.tag ?? ""}</span>
        </div>
      `;
    } else {
      const rows = [
        `
          <div class="ledger-row">
            <span>${entry.name}</span>
            <span class="amount ${amountClass}">¤${formatCurrency(entry.amount)}</span>
          </div>
        `,
        `
          <div class="ledger-row">
            <span>${entry.ailment}</span>
            <span>${entry.profile}${entry.emergency ? " • Emergency" : ""}</span>
          </div>
        `,
        `
          <div class="ledger-row">
            <span>${entry.method ?? "Billing"}</span>
            <span>Charge ¤${formatCurrency(entry.charge ?? 0)}</span>
          </div>
        `,
      ];
      if (entry.deferred) {
        rows.push(`
          <div class="ledger-row">
            <span>Deferred Balance</span>
            <span>¤${formatCurrency(entry.deferred)}${entry.term ? ` • ${entry.term}d` : ""}</span>
          </div>
        `);
      }
      if (entry.financeFee) {
        rows.push(`
          <div class="ledger-row">
            <span>Processing Fee</span>
            <span class="amount negative">-¤${formatCurrency(entry.financeFee)}</span>
          </div>
        `);
      }
      li.innerHTML = rows.join("");
    }
    elements.billingLedger.appendChild(li);
  });
};

const recordLedgerEvent = ({ name, detail, amount, tag = "" }) => {
  state.billingRecords.unshift({
    custom: true,
    name,
    detail,
    amount,
    tag,
  });
  if (state.billingRecords.length > 8) {
    state.billingRecords.pop();
  }
  renderBillingLedger();
};

const recordBilling = (patient, outcome) => {
  state.billingRecords.unshift({
    name: patient.name,
    ailment: patient.ailment.name,
    amount: outcome.netCash,
    profile: patient.profile.label,
    emergency: patient.isEmergency,
    method: outcome.methodLabel,
    charge: outcome.charge,
    insurancePortion: outcome.insuranceCovered,
    patientPortion: outcome.patientPortion,
    deferred: outcome.receivable,
    financeFee: outcome.financeFee,
    term: outcome.plan?.daysRemaining ?? 0,
  });
  if (state.billingRecords.length > 8) {
    state.billingRecords.pop();
  }
  renderBillingLedger();
};

const calculateBillingOutcome = (patient, { preview = false } = {}) => {
  const profile = patient.profile ?? {};
  const baseCharge = patient.ailment.charge ?? Math.round(patient.ailment.payout * 1.2);
  const profileMultiplier = profile.modifier ?? 1;
  const billingBoost = hasRoomBuilt("billing") && countStaffByRole("accountant") ? 1.15 : 1;
  const emergencyBoost = patient.isEmergency ? 1.2 : 1;
  const erBoost = patient.isEmergency && hasRoomBuilt("emergency") ? 1.1 : 1;
  const hospitalityBoost = hasRoomBuilt("gourmet") && countStaffByRole("chef") ? 1.05 : 1;
  const showtimeBoost =
    ["clowncare", "holotheatre"].includes(patient.ailment.room) && countStaffByRole("entertainer")
      ? 1.25
      : 1;
  const welfareBonus = 1 + state.ambience.welfare * 0.02;
  const reputationBonus = 1 + state.ambience.reputation * 0.01;
  const finalCharge = Math.max(
    0,
    Math.round(
      baseCharge *
        profileMultiplier *
        billingBoost *
        emergencyBoost *
        erBoost *
        hospitalityBoost *
        showtimeBoost *
        welfareBonus *
        reputationBonus
    )
  );

  const coverageRate = profile.coverage ?? 0;
  let insuranceCovered = Math.round(finalCharge * coverageRate);
  let patientPortion = finalCharge - insuranceCovered;
  if (profile.copay) {
    patientPortion = Math.max(patientPortion, profile.copay);
    insuranceCovered = Math.max(0, finalCharge - patientPortion);
  }
  if (profile.discount) {
    patientPortion = Math.max(0, Math.round(patientPortion * (1 - profile.discount)));
    insuranceCovered = Math.max(0, finalCharge - patientPortion);
  }

  let financeFee = 0;
  let methodLabel = profile.label ?? "Self-Pay";
  let receivable = 0;
  let deposit = 0;
  let plan = null;

  switch (profile.method) {
    case "insurance":
      methodLabel = `Insurance (${Math.round((coverageRate || 0) * 100)}% cover)`;
      break;
    case "credit": {
      const feeRate = profile.processingFee ?? 0;
      financeFee = Math.round(patientPortion * feeRate);
      insuranceCovered = 0;
      methodLabel = "Credit Card";
      break;
    }
    case "cash":
      insuranceCovered = 0;
      methodLabel = "Cash Payment";
      break;
    case "installment": {
      const rate = profile.depositRate ?? 0.2;
      const term = Math.max(4, profile.term ?? 8);
      deposit = Math.round(finalCharge * rate);
      receivable = Math.max(0, finalCharge - deposit);
      const dailyPayment = Math.max(50, Math.round(receivable / term));
      insuranceCovered = 0;
      methodLabel = `Installment (${term}d)`;
      plan = {
        patientName: patient.name,
        total: finalCharge,
        remaining: receivable,
        dailyPayment,
        daysRemaining: term,
      };
      break;
    }
    default:
      break;
  }

  let netCash = insuranceCovered + patientPortion;
  if (profile.method === "credit") {
    netCash = Math.max(0, patientPortion - financeFee);
  }
  if (profile.method === "cash") {
    netCash = patientPortion;
  }
  if (profile.method === "installment") {
    netCash = deposit;
  }

  const outcome = {
    charge: finalCharge,
    netCash,
    insuranceCovered,
    patientPortion,
    financeFee,
    receivable,
    methodLabel,
    plan: plan && !preview ? plan : plan ? { ...plan, preview: true } : null,
    deposit,
    profileId: profile.id,
    profileLabel: profile.label,
  };

  return outcome;
};

const getBillingPreview = (patient) => calculateBillingOutcome(patient, { preview: true });

const hireStaff = (candidateId) => {
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) return;
  if (state.stats.cash < candidate.salary * 5) {
    logEvent("Not enough funds to cover onboarding for this staff member.", "negative");
    return;
  }
  state.stats.cash -= candidate.salary * 5;
  state.staff.push({ ...candidate, assignedRoom: null });
  state.candidates = state.candidates.filter((c) => c.id !== candidateId);
  state.candidates.push(generateCandidate());
  logEvent(`Hired ${candidate.name}, a ${formatStaffRole(candidate.role)}.`, "positive");
  renderCandidates();
  renderRoster();
  updateStats();
};

const handleBuildClick = (x, y) => {
  if (designerState.editingRoomId) {
    logEvent("Apply or cancel the current room edit before placing new rooms.", "warning");
    return;
  }
  const blueprint = selectedRoom ?? designerState.blueprint;
  if (!blueprint) return;
  const size = getSizeOption(designerState.sizeId);
  const coordLabel = `${AXIS_LETTERS[x] ?? x + 1}${y + 1}`;
  if (!isTileUnlocked(x, y)) {
    const parcel = getParcelAt(x, y);
    if (parcel && !parcel.owned) {
      logEvent(
        `${parcel.name} is still locked. Purchase it from Hospital Grounds before building on plot ${coordLabel}.`,
        "warning"
      );
    } else {
      logEvent(`That area of the campus isn't zoned for construction yet.`, "warning");
    }
    return;
  }
  if (!canPlaceFootprint(x, y, size.width, size.height)) {
    logEvent(`Not enough free space to place ${blueprint.name} at plot ${coordLabel}.`, "negative");
    return;
  }
  const machines = Array.from(designerState.machines);
  if (!machines.length) {
    machines.push("standard-kit");
  }
  const decorations = Array.from(designerState.decorations);
  const preview = summarizeRoomDesign({
    blueprint,
    sizeId: designerState.sizeId,
    interiorId: designerState.interiorId,
    machines,
    decorations,
  });
  if (state.stats.cash < preview.totalCost) {
    logEvent(
      `Not enough cash to build ${blueprint.name} with the selected upgrades (requires ¤${formatCurrency(preview.totalCost)}).`,
      "negative"
    );
    return;
  }

  const room = {
    id: `room-${roomIdCounter++}`,
    type: blueprint.id,
    roleRequired: blueprint.roleRequired,
    baseCost: blueprint.cost,
    baseUpkeep: blueprint.upkeep,
    costInvested: preview.totalCost,
    upkeep: preview.upkeep,
    reputationBoost: preview.reputationBoost,
    environmentBoost: preview.environmentBoost,
    welfareBoost: preview.welfareBoost,
    moraleBoost: preview.moraleBoost,
    severityBoost: preview.severityBoost,
    decorations: [...decorations],
    machines: [...machines],
    sizeId: size.id,
    interiorId: designerState.interiorId,
    width: size.width,
    height: size.height,
    x,
    y,
    severityCapacity: Math.max(0, Math.round((blueprint.baseSeverity ?? 0) + preview.severityBoost)),
  };
  occupyRoomFootprint(room);
  state.rooms.push(room);
  state.stats.cash -= preview.totalCost;
  state.stats.expensesToday += preview.totalCost;
  state.stats.reputation = clamp(
    state.stats.reputation + blueprint.reputation + (preview.reputationBoost ?? 0),
    0,
    100
  );
  recalculateAmbience();
  renderRoomManagement();
  updateGrid();
  renderHospitalCanvas();
  updateQueue();
  updateStats();
  evaluateObjectives();
  updateBuildGuidance();
  logEvent(
    `${blueprint.name} constructed at ${coordLabel} for ¤${formatCurrency(preview.totalCost)} with ${machines.length} machines and ${decorations.length} decor upgrades.`,
    "positive"
  );
  if (elements.blueprintFootnote) {
    elements.blueprintFootnote.textContent = `${blueprint.name} placed at plot ${coordLabel}. Click another top-left tile or press Esc to cancel.`;
  }
};

const investResearch = (projectId) => {
  const project = state.projects.find((p) => p.id === projectId);
  if (!project || project.unlocked) return;
  if (state.stats.cash < project.cost) {
    logEvent("Not enough cash to invest in research.", "negative");
    return;
  }
  state.stats.cash -= project.cost;
  project.progress = Math.min(100, project.progress + 20);
  if (project.progress >= 100) {
    project.unlocked = true;
    unlockResearchReward(project);
  }
  renderProjects();
  updateStats();
};

const unlockResearchReward = (project) => {
  switch (project.id) {
    case "imaging":
      roomCatalog.push({
        id: "radiology",
        name: "Radiology",
        cost: 22000,
        upkeep: 700,
        roleRequired: ["doctor", "technician"],
        reputation: 6,
        description: "Top-tier diagnostic wing boosting payouts.",
      });
      {
        const newRoom = roomCatalog[roomCatalog.length - 1];
        newRoom.baseSeverity = baseSeverityMap[newRoom.id] ?? 1;
        newRoom.designProfile = {
          sizes: [...defaultDesignProfile.sizes],
          interiors: [...defaultDesignProfile.interiors],
          machines:
            (baseSeverityMap[newRoom.id] ?? 1) > 0
              ? [...defaultDesignProfile.machines]
              : ["standard-kit"],
          decor: [...defaultDesignProfile.decor],
          defaultMachines: [...defaultDesignProfile.defaultMachines],
        };
        if ((baseSeverityMap[newRoom.id] ?? 1) <= 0) {
          newRoom.designProfile.machines = ["standard-kit"];
        }
      }
      ailments.push({ id: "spectral", name: "Spectral Syndrome", severity: 3, room: "radiology", payout: 2800 });
      renderBuildOptions();
      logEvent("Radiology unlocked via Advanced Imaging research!", "positive");
      break;
    case "biofilter":
      state.stats.cleanliness = Math.min(100, state.stats.cleanliness + 15);
      logEvent("Hospital cleanliness improved thanks to bio-filtered air.", "positive");
      break;
    case "wellness":
      state.stats.morale = Math.min(100, state.stats.morale + 15);
      logEvent("Staff morale surges with holistic wellness upgrades.", "positive");
      break;
    default:
      break;
  }
};

const launchCampaign = (campaignId) => {
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return;
  if (state.stats.cash < campaign.cost) {
    logEvent("Campaign is too expensive right now.", "negative");
    return;
  }
  state.stats.cash -= campaign.cost;
  state.marketingEffects.push({
    ...campaign,
    remaining: campaign.duration,
  });
  logEvent(`${campaign.name} launched!`, "positive");
  updateStats();
};

const evaluateObjectives = () => {
  state.objectives.forEach((objective) => {
    if (!objective.completed && objective.condition(state)) {
      objective.completed = true;
      state.stats.reputation += 4;
      logEvent(`Objective completed: ${objective.text}`, "positive");
    }
  });
  updateObjectives();
  updateStats();
};

const createPatient = ({ ailment = randomFrom(ailments), emergency = false } = {}) => {
  const profile = randomFrom(billingProfiles);
  let patience = emergency ? 140 : 100;
  patience += state.ambience.environment * 4;
  patience += state.ambience.welfare * 2;
  if (elements.policies.fastTrack.checked) {
    patience += emergency ? 20 : 10;
  }
  if (hasRoomBuilt("cafeteria")) {
    patience += 5;
  }
  if (hasRoomBuilt("triage")) {
    patience += emergency ? 10 : 6;
  }
  if (hasRoomBuilt("clowncare")) {
    patience += 4;
  }
  if (hasRoomBuilt("holotheatre")) {
    patience += 6;
  }
  if (hasRoomBuilt("zen")) {
    patience += 3;
  }
  return {
    id: patientIdCounter++,
    name: randomFrom(patientNames),
    ailment,
    patience,
    profile,
    isEmergency: emergency,
    blockedBy: null,
  };
};

const spawnPatient = ({ emergency = false, ailment, announce = emergency } = {}) => {
  const patient = createPatient({ ailment: ailment || randomFrom(emergency ? emergencyCases : ailments), emergency });
  if (emergency) {
    state.queue.unshift(patient);
  } else {
    state.queue.push(patient);
  }
  if (announce) {
    const tone = emergency ? "warning" : "neutral";
    const verb = emergency ? "in crisis" : "seeking help for";
    logEvent(`${patient.name} arrives ${verb} ${patient.ailment.name}.`, tone);
  }
  updateQueue();
  return patient;
};

const adjustStaffMorale = () => {
  if (!state.staff.length) {
    state.stats.morale = Math.max(0, state.stats.morale - 0.2);
    return;
  }
  const moraleDelta = state.rooms.some((room) => room.type === "staffroom") ? 1 : -1;
  state.staff.forEach((member) => {
    member.morale = Math.max(0, Math.min(100, member.morale + moraleDelta));
  });
  state.stats.morale = Math.round(
    state.staff.reduce((acc, cur) => acc + cur.morale, 0) / state.staff.length
  );
};

const processQueue = () => {
  if (!state.queue.length) return;
  const patient = state.queue[0];
  const treatmentRoom = state.rooms.find((room) => room.type === patient.ailment.room);
  if (!treatmentRoom) return;
  const hasStaff = treatmentRoom.roleRequired.every((role) =>
    state.staff.some((member) => member.role === role)
  );
  if (!hasStaff) return;
  const blueprint = getBlueprint(treatmentRoom.type);
  const severityCapacity =
    treatmentRoom.severityCapacity ??
    Math.max(0, Math.round((blueprint?.baseSeverity ?? 0) + (treatmentRoom.severityBoost ?? 0)));
  if (severityCapacity && patient.ailment.severity > severityCapacity) {
    if (patient.blockedBy !== treatmentRoom.id) {
      patient.blockedBy = treatmentRoom.id;
      logEvent(
        `${patient.name} requires upgraded equipment in ${blueprint?.name ?? treatmentRoom.type}.`,
        "warning"
      );
    }
    return;
  }
  patient.blockedBy = null;
  const outcome = calculateBillingOutcome(patient);
  state.queue.shift();
  state.stats.cash += outcome.netCash;
  state.stats.revenueToday += outcome.netCash;
  state.stats.patientsTreated += 1;
  const reputationBoost = patient.isEmergency ? 2 : 1;
  state.stats.reputation = clamp(state.stats.reputation + reputationBoost, 0, 100);
  state.stats.efficiency = clamp(state.stats.efficiency + (patient.isEmergency ? 1 : 0.5), 0, 100);
  state.stats.cleanliness = clamp(state.stats.cleanliness - (patient.isEmergency ? 1 : 0.5), 0, 100);
  if (patient.ailment.room === "maternity") {
    state.stats.reputation = clamp(state.stats.reputation + 2, 0, 100);
  }
  if (patient.ailment.room === "pediatrics") {
    state.stats.reputation = clamp(state.stats.reputation + 1, 0, 100);
  }
  if (["clowncare", "holotheatre"].includes(patient.ailment.room)) {
    state.stats.morale = clamp(state.stats.morale + 2, 0, 100);
  }
  if (patient.ailment.room === "zen") {
    state.stats.morale = clamp(state.stats.morale + 1.5, 0, 100);
  }
  if (patient.ailment.room === "burn") {
    state.stats.cleanliness = clamp(state.stats.cleanliness - 0.5, 0, 100);
  }
  state.stats.morale = clamp(state.stats.morale + state.ambience.morale * 0.05, 0, 100);
  state.stats.reputation = clamp(state.stats.reputation + state.ambience.reputation * 0.05, 0, 100);
  if (outcome.financeFee) {
    state.stats.expensesToday += outcome.financeFee;
    recordLedgerEvent({
      name: "Card Processing",
      detail: `${patient.name} fee`,
      amount: -outcome.financeFee,
      tag: "Billing",
    });
  }
  if (outcome.plan && !outcome.plan.preview) {
    addInstallmentPlan(outcome.plan);
  }
  recordBilling(patient, outcome);
  let logMessage = `${patient.name} treated for ${patient.ailment.name} (${patient.profile.label}). Charge ¤${formatCurrency(
    outcome.charge
  )} via ${outcome.methodLabel}.`;
  if (outcome.receivable) {
    logMessage += ` ¤${formatCurrency(outcome.receivable)} scheduled for installments.`;
  }
  logEvent(logMessage, "positive");
  updateStats();
  updateQueue();
};

const handleEmergencyEvents = () => {
  if (state.stats.tick < DAY_TICKS) return;
  if (state.queue.some((patient) => patient.isEmergency)) return;
  if (Math.random() < 0.08) {
    const emergency = spawnPatient({ emergency: true, ailment: randomFrom(emergencyCases), announce: true });
    emergency.patience += 20;
  }
};

const handlePatientPatience = () => {
  let changed = false;
  const triageSupport = hasRoomBuilt("triage") && countStaffByRole("nurse") && countStaffByRole("assistant");
  const entertainerSupport = hasRoomBuilt("clowncare") && countStaffByRole("entertainer");
  const theatreSupport = hasRoomBuilt("holotheatre") && countStaffByRole("entertainer");
  const zenSupport = hasRoomBuilt("zen") && countStaffByRole("therapist");
  const gourmetSupport = hasRoomBuilt("gourmet") && countStaffByRole("chef");
  const giftSupport = hasRoomBuilt("giftshop") && countStaffByRole("assistant");
  const securityCover = hasRoomBuilt("securityoffice") && countStaffByRole("security");
  const snackSupport = getTotalAmenityCount("snack");
  const hydrationSupport = getTotalAmenityCount("hydration");
  state.queue = state.queue.filter((patient) => {
    let patienceDrop = patient.isEmergency ? 6 : 4;
    if (triageSupport) {
      patienceDrop -= 1;
    }
    if (entertainerSupport) {
      patienceDrop -= 0.5;
    }
    if (theatreSupport) {
      patienceDrop -= 0.5;
    }
    if (zenSupport) {
      patienceDrop -= 0.3;
    }
    if (gourmetSupport) {
      patienceDrop -= 0.2;
    }
    if (hydrationSupport) {
      patienceDrop -= Math.min(1, hydrationSupport * 0.15);
    }
    patienceDrop -= state.ambience.environment * 0.3;
    patienceDrop = Math.max(1, patienceDrop);
    patient.patience -= patienceDrop;
    if (hasRoomBuilt("cafeteria")) {
      patient.patience += 1;
    }
    if (giftSupport) {
      patient.patience += 0.5;
    }
    if (snackSupport) {
      patient.patience += Math.min(2, snackSupport * 0.6);
    }
    if (hydrationSupport) {
      patient.patience += Math.min(1, hydrationSupport * 0.4);
    }
    if (zenSupport) {
      patient.patience += 0.4;
    }
    patient.patience += state.ambience.welfare * 0.3;
    patient.patience += state.ambience.morale * 0.15;
    patient.patience = clamp(patient.patience, 0, 180);
    if (patient.patience <= 0) {
      changed = true;
      let penalty = patient.isEmergency ? 4 : 2;
      if (securityCover) {
        penalty = Math.max(1, penalty - 1);
      }
      state.stats.reputation = clamp(state.stats.reputation - penalty, 0, 100);
      logEvent(`${patient.name} left after waiting too long.`, "negative");
      return false;
    }
    return true;
  });
  return changed;
};

const handleFacilitiesUpkeep = () => {
  const janitors = countStaffByRole("janitor");
  const facilityManagers = countStaffByRole("facility");
  let queueAdjusted = false;
  let cleanliness = clamp(state.stats.cleanliness + janitors * 0.6 + facilityManagers * 0.4 - 0.3, 0, 100);

  const snackVendors = getTotalAmenityCount("snack");
  const hydrationStations = getTotalAmenityCount("hydration");
  const atmCount = getTotalAmenityCount("atm");
  const totalPlants = getTotalPlants();

  if (snackVendors && state.queue.length) {
    const buyers = Math.min(state.queue.length, Math.ceil(Math.random() * snackVendors));
    if (buyers > 0) {
      const spendPer = 9 + Math.floor(Math.random() * 7);
      const revenue = buyers * spendPer;
      state.stats.cash += revenue;
      state.stats.revenueToday += revenue;
      state.stats.morale = clamp(state.stats.morale + buyers * 0.25, 0, 100);
      state.litter = (state.litter ?? 0) + buyers;
      recordLedgerEvent({
        name: "Concessions",
        detail: `${buyers} snack${buyers > 1 ? "s" : ""} sold`,
        amount: revenue,
        tag: "Amenity",
      });
      if (Math.random() < 0.25) {
        logEvent(`${buyers} patient${buyers > 1 ? "s" : ""} grabbed snacks while waiting.`, "neutral");
      }
      queueAdjusted = true;
    }
  }

  if (hydrationStations && state.queue.length) {
    state.queue.forEach((patient) => {
      patient.patience = clamp(patient.patience + hydrationStations * 0.3, 0, 200);
    });
    queueAdjusted = true;
  }

  if (atmCount && Math.random() < 0.2) {
    const visitors = Math.max(1, Math.min(atmCount, Math.round(Math.random() * Math.max(1, state.queue.length))));
    const fees = visitors * 5;
    state.stats.cash += fees;
    state.stats.revenueToday += fees;
    recordLedgerEvent({
      name: "ATM Fees",
      detail: `${visitors} withdrawal${visitors > 1 ? "s" : ""}`,
      amount: fees,
      tag: "Amenity",
    });
    if (Math.random() < 0.3) {
      logEvent(`ATM fees added ¤${formatCurrency(fees)} to today's takings.`, "positive");
    }
  }

  const litterPenalty = (state.litter ?? 0) * 0.25;
  cleanliness = clamp(cleanliness - litterPenalty, 0, 100);
  state.stats.grounds = clamp(state.stats.grounds - litterPenalty * 0.8, 0, 100);

  if (facilityManagers || janitors) {
    const cleaned = Math.min(state.litter ?? 0, facilityManagers * 2 + janitors);
    if (cleaned > 0) {
      state.litter -= cleaned;
      cleanliness = clamp(cleanliness + cleaned * 0.8, 0, 100);
      state.stats.grounds = clamp(state.stats.grounds + cleaned * 1.4, 0, 100);
      if (Math.random() < 0.25) {
        logEvent(`Facility crew cleared ${cleaned} litter pile${cleaned > 1 ? "s" : ""}.`, "positive");
      }
    }
    if (!state.litter && facilityManagers) {
      state.stats.grounds = clamp(state.stats.grounds + facilityManagers * 0.3, 0, 100);
    }
  }

  if (totalPlants) {
    const hydration = facilityManagers * 2;
    const thirst = Math.max(0.6, totalPlants * 0.4);
    state.stats.plantCare = clamp(state.stats.plantCare + hydration - thirst, 0, 100);
    if (facilityManagers && Math.random() < 0.2) {
      logEvent("Facility managers tended to the greenery, lifting the ambience.", "positive");
    }
  } else {
    state.stats.plantCare = clamp(state.stats.plantCare + 0.3, 0, 100);
  }

  state.stats.cleanliness = cleanliness;
  const entertainerCount = countStaffByRole("entertainer");
  const therapistCount = countStaffByRole("therapist");
  const chefCount = countStaffByRole("chef");
  const assistantCount = countStaffByRole("assistant");
  const securityCount = countStaffByRole("security");
  if (hasRoomBuilt("cafeteria")) {
    if (assistantCount) {
      state.queue.forEach((patient) => {
        patient.patience = clamp(patient.patience + assistantCount * 0.4, 0, 160);
      });
      queueAdjusted = true;
    }
  }
  if (hasRoomBuilt("triage") && assistantCount && countStaffByRole("nurse")) {
    state.stats.efficiency = clamp(state.stats.efficiency + 0.3, 0, 100);
  }
  if (hasRoomBuilt("clowncare") && entertainerCount) {
    state.stats.morale = clamp(state.stats.morale + entertainerCount * 0.4, 0, 100);
  }
  if (hasRoomBuilt("holotheatre") && entertainerCount) {
    state.queue.forEach((patient) => {
      patient.patience = clamp(patient.patience + 0.6 * entertainerCount, 0, 180);
    });
    queueAdjusted = true;
  }
  if (hasRoomBuilt("zen") && therapistCount) {
    state.stats.morale = clamp(state.stats.morale + therapistCount * 0.5, 0, 100);
  }
  if (hasRoomBuilt("gourmet") && chefCount) {
    state.stats.morale = clamp(state.stats.morale + chefCount * 0.4, 0, 100);
    state.stats.cleanliness = clamp(state.stats.cleanliness + 0.1 * chefCount, 0, 100);
  }
  if (hasRoomBuilt("giftshop") && assistantCount) {
    state.stats.reputation = clamp(state.stats.reputation + 0.15 * assistantCount, 0, 100);
  }
  if (hasRoomBuilt("securityoffice") && securityCount) {
    state.stats.efficiency = clamp(state.stats.efficiency + securityCount * 0.2, 0, 100);
  }
  if (hasRoomBuilt("maternity") && countStaffByRole("midwife")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.2, 0, 100);
  }
  if (hasRoomBuilt("pediatrics") && countStaffByRole("doctor")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.1, 0, 100);
  }
  if (hasRoomBuilt("oncology") && countStaffByRole("technician")) {
    state.stats.reputation = clamp(state.stats.reputation + 0.2, 0, 100);
  }
  if (hasRoomBuilt("billing") && countStaffByRole("accountant")) {
    state.stats.efficiency = clamp(state.stats.efficiency + 0.2, 0, 100);
  }
  return queueAdjusted;
};

const logDailySummary = () => {
  const revenue = state.stats.revenueToday;
  const expenses = state.stats.expensesToday;
  const net = revenue - expenses;
  const tone = net >= 0 ? "positive" : "negative";
  logEvent(
    `Day ${state.stats.day} summary — Revenue: ¤${formatCurrency(revenue)}, Expenses: ¤${formatCurrency(expenses)}, Net: ¤${formatCurrency(net)}.`,
    tone
  );
};

const payExpenses = () => {
  const wages = state.staff.reduce((sum, staff) => sum + staff.salary, 0);
  const upkeep = state.rooms.reduce((sum, room) => sum + room.upkeep, 0);
  const overtimeCost = elements.policies.overtime.checked ? wages * 0.15 : 0;
  const total = wages + upkeep + overtimeCost;
  state.stats.cash -= total;
  state.stats.expensesToday += total;
  logEvent(`Daily upkeep paid: ¤${formatCurrency(total)}.`, "neutral");
  if (state.stats.cash < 0) {
    state.stats.reputation = Math.max(0, state.stats.reputation - 3);
    logEvent("Debt accrued! Reputation suffers.", "negative");
  }
};

const decayMetrics = () => {
  state.stats.cleanliness = Math.max(0, state.stats.cleanliness - 0.5);
  state.stats.efficiency = Math.max(0, state.stats.efficiency - 0.4);
  if (!elements.policies.overtime.checked) {
    state.stats.morale = Math.max(0, state.stats.morale - 0.5);
  }
  const litterDrag = (state.litter ?? 0) * 0.04;
  state.stats.grounds = clamp(state.stats.grounds - 0.08 - litterDrag, 0, 100);
  const totalPlants = getTotalPlants();
  const plantDecay = totalPlants ? Math.min(3, 0.3 + totalPlants * 0.04) : 0.15;
  state.stats.plantCare = clamp(state.stats.plantCare - plantDecay, 0, 100);
  if (state.stats.cleanliness < 40) {
    state.stats.reputation = Math.max(0, state.stats.reputation - 0.5);
  }
};

const processMarketingEffects = () => {
  state.marketingEffects = state.marketingEffects.filter((effect) => {
    effect.remaining -= 1;
    if (effect.id === "prime") {
      spawnPatient();
    }
    if (effect.id === "investors" && state.stats.morale < 50) {
      state.stats.reputation = Math.max(0, state.stats.reputation - 2);
    }
    if (effect.id === "community") {
      state.stats.reputation = Math.min(100, state.stats.reputation + 1);
    }
    return effect.remaining > 0;
  });
};

const updateDailyReport = () => {
  const wages = state.staff.reduce((sum, staff) => sum + staff.salary, 0);
  const upkeep = state.rooms.reduce((sum, room) => sum + room.upkeep, 0);
  const revenue = state.stats.revenueToday;
  const expenses = state.stats.expensesToday;
  const net = revenue - expenses;
  const litterCount = Math.max(0, Math.round(state.litter ?? 0));
  const loanBalance = Math.round(
    state.loans.reduce((sum, loan) => sum + loan.remainingBalance, 0)
  );
  const receivables = Math.round(
    state.installmentPlans.reduce((sum, plan) => sum + plan.remaining, 0)
  );
  const report = `
    <div><strong>Wages:</strong> ¤${formatCurrency(wages)}</div>
    <div><strong>Upkeep:</strong> ¤${formatCurrency(upkeep)}</div>
    <div><strong>Queue:</strong> ${state.queue.length} patients</div>
    <div><strong>Marketing:</strong> ${state.marketingEffects.length} active</div>
    <div><strong>Grounds:</strong> ${Math.round(state.stats.grounds)} / 100</div>
    <div><strong>Litter:</strong> ${litterCount} pile${litterCount === 1 ? "" : "s"}</div>
    <div><strong>Loans Outstanding:</strong> ¤${formatCurrency(loanBalance)}</div>
    <div><strong>Receivables:</strong> ¤${formatCurrency(receivables)}</div>
    <div><strong>Revenue Today:</strong> ¤${formatCurrency(revenue)}</div>
    <div><strong>Expenses Today:</strong> ¤${formatCurrency(expenses)}</div>
    <div><strong>Net:</strong> ¤${formatCurrency(net)}</div>
  `;
  elements.dailyReport.innerHTML = report;
};

const updateUI = () => {
  updateStats();
  updateQueue();
  renderRoster();
  renderCandidates();
  renderProjects();
  renderCampaigns();
  updateObjectives();
  renderBillingLedger();
  updateDailyReport();
  updateFinancePanels();
};

const tick = () => {
  state.stats.tick += 1;
  if (state.stats.tick % 8 === 0) {
    spawnPatient({ announce: false });
  }
  handleEmergencyEvents();
  const patienceChanged = handlePatientPatience();
  processQueue();
  const facilitiesTouched = handleFacilitiesUpkeep();
  adjustStaffMorale();
  decayMetrics();
  recalculateAmbience();
  if (patienceChanged || facilitiesTouched) {
    updateQueue();
  }
  updateDailyReport();
  updateStats();
  updateFinancePanels();
  renderHospitalCanvas();
  if (state.stats.tick % DAY_TICKS === 0) {
    payExpenses();
    processLoans();
    processInstallments();
    processMarketingEffects();
    evaluateObjectives();
    logDailySummary();
    state.stats.day += 1;
    state.stats.revenueToday = 0;
    state.stats.expensesToday = 0;
    updateDailyReport();
    updateStats();
  }
};

const highlightPanel = (selector) => {
  if (!selector) {
    return;
  }
  const panel = document.querySelector(selector);
  if (!panel) {
    return;
  }
  panel.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
  panel.classList.add("highlight-panel");
  setTimeout(() => {
    panel.classList.remove("highlight-panel");
  }, 1200);
};

const updateMenuOptions = (activeTab) => {
  let hasActiveOption = false;
  menuOptions.forEach((option) => {
    const shouldShow = option.dataset.tabTarget === activeTab;
    option.toggleAttribute("hidden", !shouldShow);
    if (!shouldShow) {
      option.classList.remove("active");
    } else if (option.classList.contains("active")) {
      hasActiveOption = true;
    }
  });
  if (!hasActiveOption) {
    const firstVisible = menuOptions.find((option) => !option.hasAttribute("hidden"));
    if (firstVisible) {
      firstVisible.classList.add("active");
    }
  }
};

const setupMenuRail = () => {
  menuOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const targetTab = option.dataset.tabTarget;
      const panelSelector = option.dataset.panel;
      if (targetTab) {
        const targetButton = document.querySelector(`.tab-button[data-tab="${targetTab}"]`);
        if (targetButton && !targetButton.classList.contains("active")) {
          targetButton.click();
        } else if (targetButton) {
          updateMenuOptions(targetTab);
        }
      }
      menuOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");
      if (panelSelector) {
        setTimeout(() => highlightPanel(panelSelector), 150);
      }
    });
  });
};

const setupTabs = () => {
  const buttons = document.querySelectorAll(".tab-button");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `tab-${button.dataset.tab}`);
      });
      updateMenuOptions(button.dataset.tab);
      if (button.dataset.tab === "build") {
        updateBuildGuidance();
      } else {
        clearBuildSelection();
      }
    });
  });
  const activeButton = document.querySelector(".tab-button.active");
  if (activeButton) {
    updateMenuOptions(activeButton.dataset.tab);
  }
};

const setupDesignerControls = () => {
  const { size, theme, apply } = elements.designer;
  if (size) {
    size.addEventListener("change", (event) => {
      designerState.sizeId = event.target.value;
      updateDesignerSummary();
      updateBuildGuidance();
    });
  }
  if (theme) {
    theme.addEventListener("change", (event) => {
      designerState.interiorId = event.target.value;
      updateDesignerSummary();
      renderHospitalCanvas();
      updateBuildGuidance();
    });
  }
  if (apply) {
    apply.addEventListener("click", applyDesignToRoom);
  }
};

const init = () => {
  setupCanvas();
  setupGrid();
  updateGrid();
  setupDesignerControls();
  updateDesignerOptions();
  updateDesignerSummary();
  renderRoomManagement();
  recalculateAmbience();
  renderBuildOptions();
  renderOwnedProperties();
  renderPropertyMarket();
  setupTabs();
  setupMenuRail();
  refreshCandidates();
  renderCandidates();
  renderRoster();
  renderProjects();
  renderCampaigns();
  updateObjectives();
  updateStats();
  updateQueue();
  renderBillingLedger();
  updateDailyReport();
  updateFinancePanels();
  renderHospitalCanvas();
  logEvent("Welcome to Pulse Point Hospital!", "positive");
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearBuildSelection();
    }
  });
  window.addEventListener("resize", () => {
    setupCanvas();
    renderHospitalCanvas();
  });
  setInterval(tick, 1000);
};

init();
