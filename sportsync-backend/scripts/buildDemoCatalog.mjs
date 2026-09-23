// Rebuild the additive demo-catalog migration after changing the fictional seed.
// These entries are examples, never accounts, bookings, awards, or verified results.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const areas = [
  ["Koramangala", 12.9352, 77.6146], ["HSR Layout", 12.9116, 77.6389],
  ["Indiranagar", 12.9719, 77.6412], ["Whitefield", 12.9698, 77.7500],
  ["Jayanagar", 12.9308, 77.5838], ["Marathahalli", 12.9569, 77.7011],
  ["BTM Layout", 12.9166, 77.6101], ["Malleshwaram", 13.0040, 77.5686],
  ["Sarjapur Road", 12.9121, 77.6908], ["Bellandur", 12.9260, 77.6762],
  ["Yelahanka", 13.1007, 77.5963], ["JP Nagar", 12.9077, 77.5851],
];
const sportPairs = [
  ["Football", "Badminton"], ["Badminton", "Tennis"],
  ["Basketball", "Football"], ["Tennis", "Badminton"],
];
const playerNames = [
  "Meera Nair", "Rohan Verma", "Kavya Iyer", "Arjun Das", "Sanya Kapoor", "Vikram Singh",
  "Priya Menon", "Nisha Fernandes", "Kabir Ahmed", "Leela Shah", "Aditi Kulkarni", "Dev Patel",
  "Tara Bhat", "Ishaan Reddy", "Zoya Khan", "Neel Joshi", "Ananya Sen", "Farhan Ali",
  "Ritika Paul", "Manav Gupta", "Diya Thomas", "Sameer Rao", "Pooja Shetty", "Aryan Jain",
];
const orgNames = [
  "Greenfield Sports Arena", "SmashCourt Badminton Club", "Eastwood Tennis Academy",
  "Baseline Basketball Centre", "Jayanagar Shuttle Point", "Indiranagar Community Sports",
  "Whitefield Practice Courts", "Koramangala Youth Football", "HSR Multi Sport Hub",
  "Malleshwaram Tennis Circle", "Bellandur Basketball Studio", "JP Nagar Sports Collective",
];
const sportForOrg = [
  "Football", "Badminton", "Tennis", "Basketball", "Badminton", "Basketball",
  "Tennis", "Football", "Football", "Tennis", "Basketball", "Badminton",
];
const titleForSport = {
  Football: "Community football practice assistant",
  Badminton: "Junior badminton session helper",
  Tennis: "Tennis practice support role",
  Basketball: "Community basketball session leader",
};
const id = (kind, index) => `demo-${kind}-${String(index + 1).padStart(2, "0")}`;
const loc = (index) => {
  const [area, lat, lng] = areas[index % areas.length];
  return { label: `${area}, Bengaluru`, lat, lng };
};
const players = playerNames.map((name, index) => {
  const [primary, secondary] = sportPairs[index % sportPairs.length];
  return {
    id: id("player", index), name, avatar: name.split(" ").map((part) => part[0]).join(""),
    location: loc(index % areas.length).label,
    sports: index % 3 === 0 ? [primary] : [primary, secondary],
    skill: { [primary]: ["Beginner", "Intermediate", "Advanced"][index % 3], [secondary]: "Intermediate" },
    availability: [["Weekday Evenings"], ["Sunday Morning"], ["Weekend Evenings", "Weekday Evenings"]][index % 3],
    competitivePreference: index % 2 ? "Friendly" : "Competitive",
    rating: 1280 + (index * 37) % 330,
  };
});
const organisations = orgNames.map((name, index) => ({
  id: id("org", index), name, location: loc(index).label,
  type: index % 3 === 0 ? "Community sports club" : index % 3 === 1 ? "Court operator" : "Training academy",
  sport: sportForOrg[index], verification: "Fictional example",
}));
const venues = organisations.map((org, index) => ({
  id: id("venue", index), orgId: org.id, orgName: org.name,
  name: `${org.name} ${org.sport === "Football" ? "Turf" : org.sport === "Basketball" ? "Court" : "Courts"}`,
  sport: org.sport, location: org.location,
  pricePerHour: 450 + (index % 6) * 150,
  facilities: org.sport === "Football" ? ["Floodlights", "Water", "Changing Room"] : ["Water", "Equipment Rental", "Seating"],
  availability: index % 2 ? ["Sunday Morning", "Weekend Evenings"] : ["Weekday Evenings"],
}));
const opportunities = organisations.map((org, index) => ({
  id: id("opportunity", index), orgId: org.id, orgName: org.name,
  title: titleForSport[org.sport], sport: org.sport, type: index % 3 === 0 ? "Part-time example" : "Volunteer example",
  location: org.location, minRating: 0, stipend: "Terms to be confirmed by a real publisher",
  description: `Fictional example role for ${org.sport.toLowerCase()} session setup and participant support. Responsibilities, selection criteria, payment and dates require a real organisation to publish and confirm them. This listing cannot accept applications.`,
  deadline: null, status: "sample",
}));
const games = venues.slice(0, 10).map((venue, index) => ({
  id: id("game", index), venueId: venue.id, venue: venue.name,
  sport: venue.sport, dayOffset: index + 2, time: index % 2 ? "18:30" : "07:00",
  capacity: venue.sport === "Football" || venue.sport === "Basketball" ? 10 : 4,
  participants: players.filter((player) => player.sports.includes(venue.sport)).slice(index % 3, index % 3 + 2).map((player) => player.id),
}));

const entries = [
  ...players.map((payload) => ["player", payload]),
  ...organisations.map((payload) => ["organisation", payload]),
  ...venues.map((payload) => ["venue", payload]),
  ...opportunities.map((payload) => ["opportunity", payload]),
  ...games.map((payload) => ["game", payload]),
];
export const demoCatalogSeed = entries;
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = entries.map(([kind, payload]) => `  (${sqlString(payload.id)}, ${sqlString(kind)}, ${sqlString(JSON.stringify(payload))}::jsonb)`).join(",\n");
const sql = `-- Fictional, read-only examples kept separate from auth users and transactional tables.\n` +
`create table if not exists public.demo_catalog_entries (\n` +
`  entry_id text primary key,\n` +
`  kind text not null check (kind in ('player', 'organisation', 'venue', 'opportunity', 'game')),\n` +
`  payload jsonb not null check (jsonb_typeof(payload) = 'object'),\n` +
`  created_at timestamptz not null default now()\n` +
`);\n` +
`create index if not exists demo_catalog_entries_kind_idx on public.demo_catalog_entries(kind);\n` +
`revoke all on public.demo_catalog_entries from anon, authenticated;\n` +
`grant select on public.demo_catalog_entries to service_role;\n` +
`insert into public.demo_catalog_entries (entry_id, kind, payload) values\n${values}\n` +
`on conflict (entry_id) do nothing;\n`;

const out = fileURLToPath(new URL("../supabase/migrations/202609230002_demo_catalog.sql", import.meta.url));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(out, sql);
  console.log(`Wrote ${entries.length} fictional examples: ${players.length} players, ${organisations.length} organisations, ${venues.length} venues, ${opportunities.length} opportunities, ${games.length} games.`);
}
