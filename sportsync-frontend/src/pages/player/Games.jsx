import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MapPin, Users } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, Modal, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { venues } from "../../data/venues";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

export default function Games() {
  const { gamesState, currentPlayer, joinGame, createGame } = useApp();
  const navigate = useNavigate();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ sport: "Football", date: "", time: "", venue: "", capacity: 10 });

  const submit = (e) => {
    e.preventDefault();
    createGame(form);
    setOpenCreate(false);
    setForm({ sport: "Football", date: "", time: "", venue: "", capacity: 10 });
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Game Module · FR-10 / FR-11"
        title="Games"
        action={
          <PrimaryButton className="flex items-center gap-1.5" onClick={() => setOpenCreate(true)}>
            <Plus size={16} /> Create game
          </PrimaryButton>
        }
      />

      {gamesState.length === 0 ? (
        <EmptyState title="No games yet" body="Create the first game or check back once one is posted." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {gamesState.map((g) => {
            const joined = g.participants.includes(currentPlayer.id);
            return (
              <div key={g.id} className="bg-white rounded-2xl p-5 stitch-border">
                <div className="flex items-center justify-between mb-3">
                  <Badge tone="navy">{g.sport}</Badge>
                  <Badge tone={g.status === "Full" ? "clay" : "turf"}>{g.status}</Badge>
                </div>
                <p className="font-display text-xl tracking-wide">{g.date} · {g.time}</p>
                <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                  <MapPin size={14} /> {g.venue}
                </p>
                <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                  <Users size={14} /> {g.participants.length}/{g.capacity} players
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/app/games/${g.id}`)}
                    className="text-sm font-semibold text-turf"
                  >
                    View details
                  </button>
                  {!joined && g.status !== "Full" && (
                    <PrimaryButton className="!px-4 !py-1.5 text-sm ml-auto" onClick={() => joinGame(g.id)}>
                      Join game
                    </PrimaryButton>
                  )}
                  {joined && <Badge tone="gold">You're in</Badge>}
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
                  onClick={() => setForm({ ...form, sport: s })}
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
            <input required type="date" className="fld" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input required type="time" className="fld" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <select required className="fld" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>
            <option value="">Select venue</option>
            {venues.filter((v) => v.sport === form.sport).map((v) => (
              <option key={v.id} value={v.name}>{v.name}</option>
            ))}
          </select>
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
          <PrimaryButton type="submit" className="w-full mt-2">Publish game</PrimaryButton>
        </form>
        <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
      </Modal>
    </div>
  );
}
