// Synthetic/demo career data (see SRS §2.4 Assumptions — prototype may use demo data)

// Demo career profile ("small blog" about the player) shown on the player's Career page.
// Kept in sync in spirit with the contact email used on the Profile page.
export const defaultCareerProfile = {
  email: "aditya.rao@example.com",
  blog:
    "Competitive footballer and evening shuttler based in Koramangala, Bengaluru. Currently on a 6-day activity " +
    "streak with a 1487 rating. Looking to move from weekend leagues into a structured academy or semi-pro " +
    "programme, and open to coaching-track opportunities on the badminton side.",
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
];
