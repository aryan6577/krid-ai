import { Link } from "react-router-dom";
import { Dumbbell, Target, Compass, Flame, Trophy, ArrowRight } from "lucide-react";
import { SectionHeading } from "../../components/ui";
import { useApp } from "../../context/AppContext";

export default function Coaching() {
  const { streak, exerciseSessions, tutorialSessions } = useApp();

  return (
    <div>
      <SectionHeading eyebrow="AI Coaching & Vision" title="Coaching hub" />
      <p className="text-sm text-ink-soft max-w-2xl mb-8">
        Camera-assisted training and structured practice, plus AI-matched sport discovery — all feeding one
        unified streak (FR-86/FR-87).
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="rounded-2xl p-5 bg-turf-deep text-white">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Current streak</p>
          <div className="flex items-center gap-2">
            <Flame size={22} className="text-gold" />
            <span className="scoreboard text-3xl font-bold">{streak.current}d</span>
          </div>
        </div>
        <div className="rounded-2xl p-5 bg-white stitch-border">
          <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">Longest streak</p>
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-clay" />
            <span className="scoreboard text-3xl font-bold text-ink">{streak.longest}d</span>
          </div>
        </div>
        <div className="rounded-2xl p-5 bg-white stitch-border">
          <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">Exercise sessions</p>
          <span className="scoreboard text-3xl font-bold text-ink">{exerciseSessions.length}</span>
        </div>
        <div className="rounded-2xl p-5 bg-white stitch-border">
          <p className="text-xs uppercase tracking-widest text-ink-soft mb-2">Tutorial sessions</p>
          <span className="scoreboard text-3xl font-bold text-ink">{tutorialSessions.length}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <HubCard
          to="/app/coaching/exercise"
          icon={Dumbbell}
          tone="turf"
          title="Exercise Mode"
          body="Camera-assisted sets & reps with form feedback — squat, lunge, push-up, plank and more."
        />
        <HubCard
          to="/app/coaching/tutorial"
          icon={Target}
          tone="clay"
          title="Tutorial Mode"
          body="Structured sport practice with measurable checkpoints — cricket batting stance & football ready stance."
        />
        <HubCard
          to="/app/coaching/alternative-sports"
          icon={Compass}
          tone="navy"
          title="Alternative Sports"
          body="Discover sports with similar movement demands to what you already play, with nearby pathways."
        />
      </div>
    </div>
  );
}

function HubCard({ to, icon: Icon, tone, title, body }) {
  const tones = { turf: "bg-turf text-white", clay: "bg-clay text-white", navy: "bg-turf-deep text-white" };
  return (
    <Link to={to} className={`rounded-2xl p-6 ${tones[tone]} flex flex-col justify-between min-h-[170px] hover:opacity-95 transition`}>
      <Icon size={26} />
      <div className="mt-4">
        <p className="font-display text-lg tracking-wide">{title}</p>
        <p className="text-sm opacity-80 mt-1">{body}</p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold mt-3">
          Open <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
