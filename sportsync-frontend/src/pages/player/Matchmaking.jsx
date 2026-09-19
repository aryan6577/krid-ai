import { useMemo, useState } from "react";
import { X, Heart, Bookmark, Sparkles } from "lucide-react";
import { SectionHeading, Badge, ProgressBar, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { rankCandidates } from "../../lib/ai";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

export default function Matchmaking() {
  const { currentPlayer, allPlayers, sendFriendRequest, pushNotification } = useApp();
  const [sport, setSport] = useState(currentPlayer.sports[0] || SPORTS[0]);
  const [index, setIndex] = useState(0);
  const [exitDir, setExitDir] = useState(null);
  const [saved, setSaved] = useState([]);
  const [log, setLog] = useState([]);

  const ranked = useMemo(() => rankCandidates(currentPlayer, allPlayers, sport), [currentPlayer, allPlayers, sport]);
  const current = ranked[index];

  const act = (action) => {
    if (!current) return;
    setExitDir(action === "reject" ? "left" : "right");
    setTimeout(() => {
      if (action === "accept") {
        sendFriendRequest(current.player.id);
        pushNotification({ type: "match", text: `You matched with ${current.player.name} for ${sport}.` });
        setLog((l) => [{ ...current, action: "Accepted" }, ...l]);
      } else if (action === "save") {
        setSaved((s) => [...s, current]);
        setLog((l) => [{ ...current, action: "Saved" }, ...l]);
      } else {
        setLog((l) => [{ ...current, action: "Rejected" }, ...l]);
      }
      setExitDir(null);
      setIndex((i) => i + 1);
    }, 220);
  };

  const changeSport = (s) => {
    setSport(s);
    setIndex(0);
  };

  return (
    <div>
      <SectionHeading
        eyebrow="AI Matchmaking · FR-08"
        title="Find compatible players"
        action={
          <div className="flex gap-2 flex-wrap">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => changeSport(s)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition ${
                  sport === s ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid lg:grid-cols-[380px_1fr] gap-8">
        <div>
          {!current ? (
            <EmptyState
              title="You've seen everyone"
              body={`No more ${sport} players to review right now. Try another sport or check back later.`}
            />
          ) : (
            <div className="relative">
              <div
                key={current.player.id}
                className={`bg-white rounded-3xl shadow-xl p-5 stitch-border ${
                  exitDir === "left" ? "animate-swipe-left" : exitDir === "right" ? "animate-swipe-right" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <Badge tone={current.score >= 75 ? "turf" : current.score >= 50 ? "gold" : "neutral"}>
                    {current.score}% match
                  </Badge>
                  <span className="scoreboard text-xs text-ink-soft">
                    {sport.toUpperCase()} · {current.distanceKm.toFixed(1)} KM
                  </span>
                </div>
                <div className="w-full h-40 rounded-2xl bg-turf-light flex items-center justify-center mb-4">
                  <span className="w-20 h-20 rounded-full bg-turf text-white font-display text-3xl flex items-center justify-center">
                    {current.player.avatar}
                  </span>
                </div>
                <p className="font-display text-2xl tracking-wide">{current.player.name}</p>
                <p className="text-sm text-ink-soft mb-3">
                  {current.player.skill?.[sport] ?? "Intermediate"} · {current.player.availability[0]} ·{" "}
                  {current.player.competitivePreference}
                </p>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-ink-soft mb-1">
                    <span>Compatibility</span>
                    <span>{current.score}/100</span>
                  </div>
                  <ProgressBar value={current.score} tone={current.score >= 75 ? "turf" : "gold"} />
                </div>
                <div className="space-y-1.5 mb-2">
                  {current.reasons.map((r, i) => (
                    <p key={i} className="text-xs flex items-center gap-1.5 text-ink-soft">
                      <Sparkles size={12} className="text-clay" /> {r}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mt-5">
                <RoundBtn onClick={() => act("reject")} tone="clay"><X size={22} /></RoundBtn>
                <RoundBtn onClick={() => act("save")} tone="gold" small><Bookmark size={17} /></RoundBtn>
                <RoundBtn onClick={() => act("accept")} tone="turf"><Heart size={22} /></RoundBtn>
              </div>
              <p className="text-center text-xs text-ink-soft/70 mt-3">
                {ranked.length - index - 1} more {sport} players in your area
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 stitch-border">
          <p className="font-display text-lg tracking-wide mb-4">Session activity</p>
          {log.length === 0 ? (
            <p className="text-sm text-ink-soft">Your accept / save / reject actions will appear here.</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center">
                      {entry.player.avatar}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{entry.player.name}</p>
                      <p className="text-xs text-ink-soft">{entry.score}% match</p>
                    </div>
                  </div>
                  <Badge tone={entry.action === "Accepted" ? "turf" : entry.action === "Saved" ? "gold" : "neutral"}>
                    {entry.action}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoundBtn({ children, onClick, tone, small }) {
  const tones = {
    clay: "bg-white border-2 border-clay text-clay hover:bg-clay hover:text-white",
    turf: "bg-white border-2 border-turf text-turf hover:bg-turf hover:text-white",
    gold: "bg-white border-2 border-gold text-[#8A6511] hover:bg-gold hover:text-white",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-full flex items-center justify-center transition shadow-md ${small ? "w-11 h-11" : "w-16 h-16"} ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
