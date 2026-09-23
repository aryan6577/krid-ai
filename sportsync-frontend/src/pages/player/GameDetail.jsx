import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Wand2, IndianRupee, Trophy } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, ProgressBar } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, pushNotification } = useApp();
  const [game, setGame] = useState(null);
  const [roster, setRoster] = useState([]);
  const [balance, setBalance] = useState(null);
  const [scoreForm, setScoreForm] = useState({ scoreA: "", scoreB: "" });
  const [saved, setSaved] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState("");
  const [paidStatus, setPaidStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadGame() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getGame(session.accessToken, id);
        if (!cancelled) {
          setGame(data.game);
          setRoster(data.participants || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load game.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (session.accessToken && id) loadGame();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken, id]);

  const runBalance = async () => {
    setError("");
    try {
      const data = await api.balanceGameTeams(session.accessToken, id, { teamCount: 2 });
      setBalance(data);
    } catch (err) {
      setError(err.message || "Could not balance teams.");
    }
  };

  const submitScore = (e) => {
    e.preventDefault();
    setSaved(true);
    pushNotification({ type: "game", text: `Result noted locally for ${game.sport} on ${game.date}: ${scoreForm.scoreA}-${scoreForm.scoreB}.` });
  };

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading game...</p>;
  }

  if (error || !game) {
    return (
      <div>
        <p className="mb-4 text-clay-deep">{error || "Game not found."}</p>
        <GhostButton onClick={() => navigate("/app/games")}>Back to games</GhostButton>
      </div>
    );
  }

  const perPerson = expenseTotal && roster.length ? Math.round(Number(expenseTotal) / roster.length) : 0;
  const togglePaid = (playerId) => setPaidStatus((s) => ({ ...s, [playerId]: !s[playerId] }));

  return (
    <div>
      <Link to="/app/games" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to games
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <Badge tone="navy">{game.sport}</Badge>
          <h1 className="font-display text-3xl tracking-wide mt-2">{game.date} · {game.time}</h1>
          <p className="text-ink-soft">Venue ref {game.venueId} · {game.participantCount}/{game.capacity} players</p>
        </div>
        <Badge tone={game.status === "Full" ? "clay" : "turf"}>{game.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading
            eyebrow="Explainable team balancer"
            title="Balanced teams"
            action={
              <PrimaryButton className="flex items-center gap-1.5 !px-4 !py-2 text-sm" onClick={runBalance}>
                <Wand2 size={15} /> {balance ? "Re-balance" : "Generate teams"}
              </PrimaryButton>
            }
          />
          {!balance ? (
            <p className="text-sm text-ink-soft">
              Uses confirmed participant ratings only, then explains how each split was formed.
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2 text-xs text-ink-soft">
                <span>Balance score</span>
                <span>{balance.balanceScore}/100</span>
              </div>
              <ProgressBar value={balance.balanceScore} tone="turf" />
              <p className="text-xs text-ink-soft mt-2">Rating difference: {balance.ratingDifference}</p>
              <div className="grid grid-cols-2 gap-4 mt-5">
                {balance.teams.map((team, index) => (
                  <TeamCol key={team.name} title={team.name} tone={index === 0 ? "turf" : "clay"} team={team.players} sum={team.totalRating} />
                ))}
              </div>
              <div className="mt-4 bg-paper-dim rounded-xl p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Why this split</p>
                <div className="space-y-1">
                  {balance.reasons.slice(0, 6).map((reason) => (
                    <p key={reason} className="text-xs text-ink-soft">{reason}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 stitch-border">
          <SectionHeading eyebrow="Result placeholder" title="Record result" />
          {saved ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-turf-light">
              <Trophy className="text-turf" />
              <div>
                <p className="font-semibold text-sm">Result noted locally</p>
                <p className="text-xs text-ink-soft">Match-result persistence arrives in a later phase.</p>
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
              <PrimaryButton type="submit" className="w-full">Save local result</PrimaryButton>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 stitch-border lg:col-span-2">
          <SectionHeading eyebrow="Expense placeholder" title="Split expenses" />
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
                Rs {Number(expenseTotal).toLocaleString("en-IN")} / {roster.length} players = <strong>Rs {perPerson.toLocaleString("en-IN")}</strong> each
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
        <span className="scoreboard text-xs text-ink-soft">sum {sum}</span>
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
