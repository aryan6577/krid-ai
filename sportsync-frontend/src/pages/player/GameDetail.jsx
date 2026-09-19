import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Wand2, IndianRupee, Trophy } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, ProgressBar } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { players as allSample, currentPlayer } from "../../data/players";
import { venues } from "../../data/venues";
import { balanceTeams } from "../../lib/ai";
import MatchForecast from "../../components/MatchForecast";

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { gamesState, allPlayers, pushNotification, recordMatchActivity } = useApp();
  const game = gamesState.find((g) => g.id === id);
  const venue = useMemo(() => venues.find((v) => v.name === game?.venue), [game]);

  const roster = useMemo(() => {
    if (!game) return [];
    return game.participants.map((pid) =>
      pid === currentPlayer.id ? currentPlayer : allPlayers.find((p) => p.id === pid) || allSample.find((p) => p.id === pid)
    ).filter(Boolean);
  }, [game, allPlayers]);

  const [balance, setBalance] = useState(null);
  const [scoreForm, setScoreForm] = useState({ scoreA: "", scoreB: "" });
  const [saved, setSaved] = useState(false);

  const [expenseTotal, setExpenseTotal] = useState(game ? "" : "");
  const [paidStatus, setPaidStatus] = useState({});

  if (!game) {
    return (
      <div>
        <p className="mb-4">Game not found.</p>
        <GhostButton onClick={() => navigate("/app/games")}>Back to games</GhostButton>
      </div>
    );
  }

  const runBalance = () => setBalance(balanceTeams(roster));

  const submitScore = (e) => {
    e.preventDefault();
    setSaved(true);
    pushNotification({ type: "game", text: `Result recorded for ${game.sport} on ${game.date}: ${scoreForm.scoreA}–${scoreForm.scoreB}.` });
    recordMatchActivity(game.id);
  };

  const perPerson = expenseTotal && roster.length ? Math.round(Number(expenseTotal) / roster.length) : 0;
  const togglePaid = (id) => setPaidStatus((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div>
      <Link to="/app/games" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to games
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <Badge tone="navy">{game.sport}</Badge>
          <h1 className="font-display text-3xl tracking-wide mt-2">{game.date} · {game.time}</h1>
          <p className="text-ink-soft">{game.venue} · {roster.length}/{game.capacity} players</p>
        </div>
        <Badge tone={game.status === "Full" ? "clay" : "turf"}>{game.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Team balancing */}
        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading
            eyebrow="AI Team Balancer · FR-12"
            title="Balanced teams"
            action={
              <PrimaryButton className="flex items-center gap-1.5 !px-4 !py-2 text-sm" onClick={runBalance}>
                <Wand2 size={15} /> {balance ? "Re-balance" : "Generate teams"}
              </PrimaryButton>
            }
          />
          {!balance ? (
            <p className="text-sm text-ink-soft">
              Uses each player's current rating to split the roster into two evenly matched sides.
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2 text-xs text-ink-soft">
                <span>Balance score</span>
                <span>{balance.balanceScore}/100</span>
              </div>
              <ProgressBar value={balance.balanceScore} tone="turf" />
              <div className="grid grid-cols-2 gap-4 mt-5">
                <TeamCol title="Team A" tone="turf" team={balance.teamA} sum={balance.sumA} />
                <TeamCol title="Team B" tone="clay" team={balance.teamB} sum={balance.sumB} />
              </div>
            </div>
          )}
        </div>

        {/* Score & performance */}
        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="FR-20 / FR-21" title="Record result" />
          {saved ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-turf-light">
              <Trophy className="text-turf" />
              <div>
                <p className="font-semibold text-sm">Result saved</p>
                <p className="text-xs text-ink-soft">Player ratings and history have been updated.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submitScore} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Team A score</p>
                  <input required type="number" min="0" className="fld" value={scoreForm.scoreA} onChange={(e) => setScoreForm({ ...scoreForm, scoreA: e.target.value })} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Team B score</p>
                  <input required type="number" min="0" className="fld" value={scoreForm.scoreB} onChange={(e) => setScoreForm({ ...scoreForm, scoreB: e.target.value })} />
                </div>
              </div>
              <PrimaryButton type="submit" className="w-full">Save result</PrimaryButton>
            </form>
          )}
        </div>

        {/* Weather / match-time forecast */}
        {venue && (
          <div className="bg-white rounded-2xl p-6 stitch-border lg:col-span-2">
            <SectionHeading eyebrow="Weather Intelligence · FR-65" title="Match-time forecast" />
            <MatchForecast lat={venue.lat} lng={venue.lng} date={game.date} />
          </div>
        )}

        {/* Expense splitting */}
        <div className="bg-white rounded-2xl p-6 stitch-border lg:col-span-2">
          <SectionHeading eyebrow="FR-19 · BR-09" title="Split expenses" />
          <div className="flex items-center gap-3 mb-5">
            <span className="text-ink-soft"><IndianRupee size={16} /></span>
            <input
              type="number"
              min="0"
              placeholder="Total amount (venue fee, equipment, etc.)"
              className="fld max-w-xs"
              value={expenseTotal}
              onChange={(e) => setExpenseTotal(e.target.value)}
            />
          </div>
          {expenseTotal && (
            <div>
              <p className="text-sm text-ink-soft mb-3">
                ₹{Number(expenseTotal).toLocaleString("en-IN")} ÷ {roster.length} players = <strong>₹{perPerson.toLocaleString("en-IN")}</strong> each
              </p>
              <div className="space-y-2">
                {roster.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-paper-dim">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center">{p.avatar}</span>
                      <p className="text-sm font-semibold">{p.name}</p>
                    </div>
                    <button onClick={() => togglePaid(p.id)} className="flex items-center gap-2">
                      <Badge tone={paidStatus[p.id] ? "turf" : "clay"}>{paidStatus[p.id] ? "Paid" : "Pending"}</Badge>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function TeamCol({ title, tone, team, sum }) {
  const bg = tone === "turf" ? "bg-turf-light" : "bg-clay-light";
  const text = tone === "turf" ? "text-turf-deep" : "text-clay-deep";
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`font-display tracking-wide ${text}`}>{title}</p>
        <span className="scoreboard text-xs text-ink-soft">Σ {sum}</span>
      </div>
      <div className="space-y-2">
        {team.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span>{p.name}</span>
            <span className="scoreboard text-ink-soft">{p.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
