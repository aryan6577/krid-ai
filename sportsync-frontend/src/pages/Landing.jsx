import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Swords, Users2, MapPinned, LineChart } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "../components/ui";
import { BrandMark, BrandWordmark } from "../components/Brand";

const pillars = [
  { icon: Swords, title: "AI Matchmaking", body: "Swipe through ranked players scored on sport, skill, availability and distance." },
  { icon: Users2, title: "Balanced Teams", body: "Every game gets two evenly matched sides — no more one-sided blowouts." },
  { icon: MapPinned, title: "Venue Recommender", body: "Ranked turfs and courts by distance, cost and real-time availability." },
  { icon: LineChart, title: "Performance & Streaks", body: "Ratings, history and streaks that keep you coming back to play." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-ink">
          <BrandMark className="w-10 h-10" tone="orange" />
          <BrandWordmark className="text-2xl" accentClassName="text-clay" />
        </span>
        <div className="flex items-center gap-3">
          <GhostButton className="!px-4 !py-2 text-sm" onClick={() => navigate("/auth?mode=login")}>Log in</GhostButton>
          <PrimaryButton className="!px-4 !py-2 text-sm" onClick={() => navigate("/auth?mode=register")}>Get started</PrimaryButton>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-turf-deep pitch-lines text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] tracking-wide">
              FIND YOUR MATCH.<br />
              BALANCE THE TEAMS.<br />
              <span className="text-clay">JUST PLAY.</span>
            </h1>
            <p className="text-white/70 text-lg mt-6 max-w-md">
              Krid.ai pairs compatible players, splits them into fair teams and books the right venue —
              so the only decision left is kickoff time.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <PrimaryButton onClick={() => navigate("/auth?mode=register")} className="flex items-center gap-2">
                Create free account <ArrowRight size={16} />
              </PrimaryButton>
              <GhostButton className="!border-white/30 !text-white hover:!border-gold hover:!text-gold" onClick={() => navigate("/auth?mode=login")}>
                I already play
              </GhostButton>
            </div>
            <Link to="/demo" className="inline-flex items-center gap-1 text-sm font-semibold text-gold underline mt-5">Explore the sample community <ArrowRight size={15} /></Link>
          </div>

          {/* Illustrative discovery card; no real person's activity or match result. */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="bg-white text-ink rounded-3xl shadow-2xl p-5 rotate-2">
              <div className="flex items-center justify-between mb-4">
                <Badge tone="gold">Sample preview</Badge>
                <span className="scoreboard text-xs text-ink-soft">FOOTBALL · BENGALURU</span>
              </div>
              <div className="w-full h-40 rounded-2xl bg-turf-light flex items-center justify-center mb-4">
                <span className="w-20 h-20 rounded-full bg-turf text-white font-display text-3xl flex items-center justify-center"><Users2 size={34} /></span>
              </div>
              <p className="font-display text-2xl tracking-wide">Find your next teammate</p>
              <p className="text-sm text-ink-soft mb-4">Explore players by sport, skill, availability and area.</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-paper-dim rounded-lg py-2">
                  <p className="scoreboard text-sm font-bold">Sport</p>
                  <p className="text-[10px] uppercase text-ink-soft">Shared interest</p>
                </div>
                <div className="bg-paper-dim rounded-lg py-2">
                  <p className="scoreboard text-sm font-bold">Skill</p>
                  <p className="text-[10px] uppercase text-ink-soft">Play level</p>
                </div>
                <div className="bg-paper-dim rounded-lg py-2">
                  <p className="scoreboard text-sm font-bold">Area</p>
                  <p className="text-[10px] uppercase text-ink-soft">Distance</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-clay text-white rounded-2xl shadow-xl px-5 py-3 -rotate-3">
              <p className="text-[10px] uppercase tracking-widest text-white/70">Explore together</p>
              <p className="scoreboard text-lg font-bold">Just play</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay mb-2">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-10">One platform, every part of game day</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl p-6 stitch-border">
              <div className="w-11 h-11 rounded-xl bg-turf-light text-turf flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <p className="font-display text-lg tracking-wide mb-1.5">{title}</p>
              <p className="text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl md:text-3xl tracking-wide">Run a turf, court or league?</h3>
            <p className="text-white/60 mt-1">List your venue, manage bookings and raise funds for upgrades.</p>
          </div>
          <PrimaryButton onClick={() => navigate("/auth?mode=register&role=organisation")}>Register as an Organisation</PrimaryButton>
        </div>
      </section>

      <footer className="text-center text-xs text-ink-soft/60 py-8">
        © 2026 Krid.ai. All Rights Reserved.
      </footer>
    </div>
  );
}
