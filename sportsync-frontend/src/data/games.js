export const games = [
  {
    id: "g201",
    sport: "Football",
    date: "2026-08-24",
    time: "7:00 PM",
    venue: "Greenfield Turf 1",
    capacity: 10,
    participants: ["p0", "p2", "p4", "p6"],
    status: "Open",
    createdBy: "p0",
  },
  {
    id: "g202",
    sport: "Badminton",
    date: "2026-08-25",
    time: "6:30 PM",
    venue: "SmashCourt Badminton Club",
    capacity: 4,
    participants: ["p1", "p5", "p7"],
    status: "Open",
    createdBy: "p1",
  },
  {
    id: "g203",
    sport: "Football",
    date: "2026-08-27",
    time: "6:00 AM",
    venue: "Greenfield Turf 2 (5-a-side)",
    capacity: 10,
    participants: ["p0", "p3", "p4", "p6", "p2"],
    status: "Full",
    createdBy: "p4",
  },
];

export const fundraisingCampaigns = [
  {
    id: "f1",
    orgId: "o0",
    orgName: "Greenfield Sports Arena",
    purpose: "New LED floodlight upgrade for evening turf sessions",
    target: 250000,
    raised: 168000,
    deadline: "2026-10-15",
    terms: "Funds used solely for lighting hardware and installation.",
    status: "Published",
  },
  {
    id: "f2",
    orgId: "o4",
    orgName: "Jayanagar Shuttle Point",
    purpose: "Junior badminton talent scholarship programme",
    target: 150000,
    raised: 42000,
    deadline: "2026-11-30",
    terms: "Scholarships awarded to under-16 players from partner schools.",
    status: "Published",
  },
];

export const fundingOpportunities = [
  { id: "fo1", provider: "State Sports Development Trust", purpose: "Grassroots turf & court infrastructure", amountRange: "₹1L – ₹5L", deadline: "2026-12-01", tags: ["infrastructure", "turf", "community"] },
  { id: "fo2", provider: "National Youth Sports Council", purpose: "Junior athlete scholarship & training support", amountRange: "₹20K – ₹1L", deadline: "2026-10-20", tags: ["scholarship", "youth", "training"] },
  { id: "fo3", provider: "Corporate Wellness Alliance", purpose: "Community sports participation drives", amountRange: "₹50K – ₹3L", deadline: "2026-11-15", tags: ["community", "wellness", "participation"] },
  { id: "fo4", provider: "GreenPlay Foundation", purpose: "Sustainable lighting & equipment grants", amountRange: "₹1L – ₹4L", deadline: "2026-12-10", tags: ["lighting", "infrastructure", "equipment"] },
];

export const sportsEvents = [
  { id: "e1", name: "Asia Cup Football Qualifiers", type: "Football", date: "2026-09-05", description: "Regional qualifier fixtures begin.", source: "AFC" },
  { id: "e2", name: "National Badminton Championship", type: "Badminton", date: "2026-09-18", description: "Ranked domestic tournament.", source: "BAI" },
  { id: "e3", name: "ITF City Tennis Open", type: "Tennis", date: "2026-10-02", description: "Open-category city tournament.", source: "ITF" },
  { id: "e4", name: "State Basketball League Finals", type: "Basketball", date: "2026-10-11", description: "Season-ending league finals.", source: "SBL" },
];

export const notifications = [
  { id: "n1", type: "match", text: "Meera Nair accepted your match invitation for Badminton.", time: "10 min ago", read: false },
  { id: "n2", type: "payment", text: "Payment of ₹1,400 confirmed for Greenfield Turf 1.", time: "2 hr ago", read: false },
  { id: "n3", type: "game", text: "Your game on 27 Aug is now full — teams will be balanced automatically.", time: "5 hr ago", read: false },
  { id: "n4", type: "streak", text: "You're on a 6-day activity streak. Play today to keep it alive!", time: "1 day ago", read: true },
  { id: "n5", type: "friend", text: "Sanya Kapoor sent you a friend request.", time: "2 days ago", read: true },
];
