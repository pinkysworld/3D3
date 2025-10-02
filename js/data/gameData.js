export const billingProfiles = [
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

export const patientNames = [
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

export const loanOffers = [
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

export const researchProjects = [
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

export const marketingCampaigns = [
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

export const ailments = [
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

export const emergencyCases = [
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

export const objectives = [
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

export const restoreObjectives = (progress = []) => {
  const base = objectives.map((objective) => ({ ...objective }));
  if (!Array.isArray(progress)) {
    return base;
  }
  progress.forEach((saved) => {
    const target = base.find((objective) => objective.id === saved.id);
    if (target) {
      target.completed = Boolean(saved.completed);
    }
  });
  return base;
};
