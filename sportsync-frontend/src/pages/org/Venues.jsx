import { useState } from "react";
import { Plus, MapPin, IndianRupee } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, Modal } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { venues as seedVenues } from "../../data/venues";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];
const SLOTS = ["Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];

export default function OrgVenues() {
  const { currentOrganisation } = useApp();
  const [myVenues, setMyVenues] = useState(seedVenues.filter((v) => v.orgId === currentOrganisation.id));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sport: "Football", location: "", pricePerHour: "", availability: [] });

  const toggleSlot = (s) => setForm((f) => ({ ...f, availability: f.availability.includes(s) ? f.availability.filter((x) => x !== s) : [...f.availability, s] }));

  const submit = (e) => {
    e.preventDefault();
    setMyVenues((v) => [
      { id: `v${Date.now()}`, orgId: currentOrganisation.id, rating: 0, facilities: [], ...form, pricePerHour: Number(form.pricePerHour) },
      ...v,
    ]);
    setOpen(false);
    setForm({ name: "", sport: "Football", location: "", pricePerHour: "", availability: [] });
  };

  const updateAvailability = (id, slot) => {
    setMyVenues((vs) =>
      vs.map((v) =>
        v.id === id
          ? { ...v, availability: v.availability.includes(slot) ? v.availability.filter((s) => s !== slot) : [...v.availability, slot] }
          : v
      )
    );
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Venue Module · FR-13 / FR-14"
        title="My venues"
        action={
          <PrimaryButton className="flex items-center gap-1.5" onClick={() => setOpen(true)}>
            <Plus size={16} /> Register venue
          </PrimaryButton>
        }
      />

      <div className="grid md:grid-cols-2 gap-5">
        {myVenues.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl p-5 stitch-border">
            <div className="flex items-center justify-between mb-3">
              <Badge tone="navy">{v.sport}</Badge>
              <span className="scoreboard text-xs text-ink-soft">{v.rating || "—"}★</span>
            </div>
            <p className="font-display text-xl tracking-wide">{v.name}</p>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1"><MapPin size={14} /> {v.location}</p>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1"><IndianRupee size={14} /> {v.pricePerHour}/hr</p>

            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mt-4 mb-2">Availability slots</p>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateAvailability(v.id, s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                    v.availability.includes(s) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Register a venue">
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Venue name" className="fld" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Sport</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <button type="button" key={s} onClick={() => setForm({ ...form, sport: s })} className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 ${form.sport === s ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <input required placeholder="Location (area, city)" className="fld" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input required type="number" placeholder="Price per hour (₹)" className="fld" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Availability</p>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button type="button" key={s} onClick={() => toggleSlot(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${form.availability.includes(s) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <PrimaryButton type="submit" className="w-full mt-2">Publish venue</PrimaryButton>
        </form>
        <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
      </Modal>
    </div>
  );
}
