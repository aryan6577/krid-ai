// Synthetic/demo career data (see SRS §2.4 Assumptions — prototype may use demo data)

// Demo career profile ("small blog" about the player) shown on the player's Career page.
// Kept in sync in spirit with the contact email used on the Profile page.
export const defaultCareerProfile = {
  email: "",
  blog: "",
};

// Opportunities can come pre-seeded from organisations, or be added live by an organisation
// via "Raise a new career opportunity" (see AppContext.createCareerOpportunity).
export const careerOpportunities = [
  {
    id: "co1",
    orgId: "o0",
    orgName: "Greenfield Sports Arena",
    title: "5-a-side Football Academy Trials",
    sport: "Football",
    type: "Trial → Contract",
    minRating: 1400,
    stipend: "₹15,000/month",
    location: "Koramangala, Bengaluru",
    description:
      "Open trials for our academy squad ahead of the district league. Looking for competitive, high-work-rate " +
      "players who can commit to weekday evening sessions.",
    deadline: "2026-10-05",
    tags: ["football", "trial", "academy"],
  },
  {
    id: "co2",
    orgId: "o1",
    orgName: "SmashCourt Badminton Club",
    title: "Badminton Coaching Assistant",
    sport: "Badminton",
    type: "Part-time",
    minRating: 1300,
    stipend: "₹10,000/month",
    location: "HSR Layout, Bengaluru",
    description:
      "Assist our head coach with junior batches on weekday evenings. Ideal first step for intermediate+ players " +
      "who want to start building a coaching career alongside competitive play.",
    deadline: "2026-10-20",
    tags: ["badminton", "coaching", "part-time"],
  },
  {
    id: "co3",
    orgId: "o3",
    orgName: "Baseline Basketball Court",
    title: "Basketball Semi-Pro Squad Tryouts",
    sport: "Basketball",
    type: "Tryout",
    minRating: 1350,
    stipend: "Performance bonuses",
    location: "Marathahalli, Bengaluru",
    description: "Open tryouts for our semi-professional 3x3 roster ahead of the state league season.",
    deadline: "2026-11-01",
    tags: ["basketball", "tryout", "semi-pro"],
  },
  {
    id: "co4",
    orgId: "o0",
    orgName: "Greenfield Sports Arena",
    title: "Football Talent Scouting Programme",
    sport: "Football",
    type: "Scouting",
    minRating: 1550,
    stipend: "₹25,000/month + accommodation",
    location: "Koramangala, Bengaluru",
    description:
      "Fast-track programme for advanced-tier players to be scouted for partner-club trials outside Bengaluru.",
    deadline: "2026-12-15",
    tags: ["football", "scouting", "advanced"],
  },
  {
    id: "co5",
    orgId: "o4",
    orgName: "Jayanagar Shuttle Point",
    title: "Junior Badminton Talent Pipeline",
    sport: "Badminton",
    type: "Scholarship-linked",
    minRating: 1250,
    stipend: "Court time + tournament fee waivers",
    location: "Jayanagar, Bengaluru",
    description: "Feeds into our junior scholarship programme — players build a tournament track record with us.",
    deadline: "2026-11-20",
    tags: ["badminton", "youth", "scholarship"],
  },
  { id: "co6", orgId: "sample-o5", orgName: "Example Community Club", title: "Community Basketball Session Leader", sport: "Basketball", type: "Part-time", minRating: 0, stipend: "Terms to be confirmed", location: "Indiranagar, Bengaluru", description: "Sample role for leading weekend beginner sessions, setting up drills, and supporting new players. Contact and eligibility details would need verification by a real publisher.", deadline: "2026-12-01", tags: ["basketball", "community"], demo: true },
  { id: "co7", orgId: "sample-o6", orgName: "Example Tennis Academy", title: "Tennis Practice Assistant", sport: "Tennis", type: "Internship", minRating: 0, stipend: "Terms to be confirmed", location: "Whitefield, Bengaluru", description: "Sample internship supporting supervised practice sessions and court setup. The academy, terms, and eligibility are fictional and cannot accept applications.", deadline: "2026-12-15", tags: ["tennis", "internship"], demo: true },
];
