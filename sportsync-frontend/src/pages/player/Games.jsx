import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MapPin, Users } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, Modal, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

export default function Games() {
  const { session } = useApp();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ sport: "Football", date: "", time: "", venueId: "", capacity: 10 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [venueOptions, setVenueOptions] = useState([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState("");

  const loadGames = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getGames(session.accessToken);
      setGames(data.games || []);
    } catch (err) {
      setError(err.message || "Could not load games.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.accessToken) loadGames();
  }, [session.accessToken]);

  useEffect(() => {
    if (!session.accessToken || !openCreate) return;
    let active = true;
    setVenueLoading(true);
    setVenueError("");
    api.discoverVenues(session.accessToken, { sport: form.sport })
      .then((data) => { if (active) setVenueOptions(data.venues || []); })
      .catch((err) => { if (active) setVenueError(err.message || "Could not load venues."); })
      .finally(() => { if (active) setVenueLoading(false); });
    return () => { active = false; };
  }, [session.accessToken, openCreate, form.sport]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
      await api.createGame(session.accessToken, {
        sport: form.sport,
        dateTime,
        venueId: form.venueId,
        capacity: form.capacity,
      });
      setOpenCreate(false);
      setForm({ sport: "Football", date: "", time: "", venueId: "", capacity: 10 });
      await loadGames();
    } catch (err) {
      setError(err.message || "Could not create game.");
    } finally {
      setSaving(false);
    }
  };

  const join = async (gameId) => {
    setError("");
    try {
      await api.joinGame(session.accessToken, gameId);
      await loadGames();
    } catch (err) {
      setError(err.message || "Could not join game.");
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Game module"
        title="Games"
        action={
          <PrimaryButton className="flex items-center gap-1.5" onClick={() => setOpenCreate(true)}>
            <Plus size={16} /> Create game
          </PrimaryButton>
        }
      />

      {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mb-5">{error}</p>}

      {loading ? (
        <EmptyState title="Loading games" body="Fetching open games and slot-fill counts." />
      ) : games.length === 0 ? (
        <EmptyState title="No live games yet" body="Create the first game or check back once one is posted." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {games.map((g) => {
            const full = g.participantCount >= g.capacity || g.status === "Full";
            return (
              <div key={g.id} className="bg-white rounded-2xl p-5 stitch-border">
                <div className="flex items-center justify-between mb-3">
                  <Badge tone="navy">{g.sport}</Badge>
                  <div className="flex gap-2"><Badge tone={full ? "clay" : "turf"}>{full ? "Full" : g.status}</Badge>{g.demo && <Badge tone="gold">Demo game</Badge>}</div>
                </div>
                <p className="font-display text-xl tracking-wide">{g.date} · {g.time}</p>
                <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                  <MapPin size={14} /> {g.venueName || `Venue ${g.venueId}`}
                </p>
                <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                  <Users size={14} /> {g.participantCount}/{g.capacity} players
                </p>
                {g.demo && <p className="text-xs text-ink-soft mt-2">Example game at a demo venue. Joining is saved to your account; no real booking or payment is made.</p>}
                <div className="flex items-center gap-3 mt-4">
                  <button onClick={() => navigate(`/app/games/${g.id}`)} className="text-sm font-semibold text-turf">
                    View details
                  </button>
                  {!g.joined && !full && (
                    <PrimaryButton className="!px-4 !py-1.5 text-sm ml-auto" onClick={() => join(g.id)}>
                      Join game
                    </PrimaryButton>
                  )}
                  {g.joined && <Badge tone="gold">You're in</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Create a game">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Sport</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm({ ...form, sport: s, venueId: "" })}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 ${
                    form.sport === s ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="game-date" className="text-sm font-semibold">Date</label><input id="game-date" required type="date" min={new Date().toISOString().slice(0, 10)} className="fld" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label htmlFor="game-time" className="text-sm font-semibold">Time</label><input id="game-time" required type="time" className="fld" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          </div>
          <div><label htmlFor="game-venue" className="text-sm font-semibold">Venue</label><select id="game-venue" required className="fld" value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}><option value="">Choose a venue</option>{venueOptions.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} · {venue.location}{venue.demo ? " · Demo" : ""}</option>)}</select>{venueLoading && <p role="status" className="text-xs text-ink-soft mt-1">Loading venues…</p>}{venueError && <p role="alert" className="text-xs text-clay-deep mt-1">{venueError}</p>}{!venueLoading && !venueError && venueOptions.length === 0 && <p className="text-xs text-ink-soft mt-1">No venues for this sport yet. Try another sport.</p>}</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Player capacity</p>
            <input
              type="range"
              min="2"
              max="22"
              step="2"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              className="w-full accent-turf"
            />
            <p className="text-sm text-ink-soft">{form.capacity} players</p>
          </div>
          <PrimaryButton disabled={saving} type="submit" className="w-full mt-2">Publish game</PrimaryButton>
        </form>
        <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
      </Modal>
    </div>
  );
}
