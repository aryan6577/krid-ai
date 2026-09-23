import { useEffect, useState } from "react";
import { Plus, MapPin, IndianRupee } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, Modal, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];
const SLOTS = ["Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];
const FACILITIES = ["Floodlights", "Changing Room", "Parking", "Water", "Equipment Rental", "Scoreboard"];

export default function OrgVenues() {
  const { session } = useApp();
  const [venues, setVenues] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    supportedSports: ["Football"],
    location: "",
    pricePerHour: "",
    facilities: [],
    availability: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadVenues = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getOrgVenues(session.accessToken);
      setVenues(data.venues || []);
    } catch (err) {
      setError(err.message || "Could not load venues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.accessToken) loadVenues();
  }, [session.accessToken]);

  const toggleFormArray = (key, value) => {
    setForm((draft) => ({
      ...draft,
      [key]: draft[key].includes(value) ? draft[key].filter((item) => item !== value) : [...draft[key], value],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createOrgVenue(session.accessToken, { ...form, pricePerHour: Number(form.pricePerHour) });
      setOpen(false);
      setForm({ name: "", supportedSports: ["Football"], location: "", pricePerHour: "", facilities: [], availability: [] });
      await loadVenues();
    } catch (err) {
      setError(err.message || "Could not register venue.");
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = async (venue, slot) => {
    const nextSlots = venue.availability.includes(slot)
      ? venue.availability.filter((existing) => existing !== slot)
      : [...venue.availability, slot];
    setError("");
    try {
      const data = await api.updateOrgVenueAvailability(session.accessToken, venue.id, nextSlots);
      setVenues((items) => items.map((item) => (item.id === venue.id ? data.venue : item)));
    } catch (err) {
      setError(err.message || "Could not update slot availability.");
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Venue registration"
        title="My venues"
        action={
          <PrimaryButton className="flex items-center gap-1.5" onClick={() => setOpen(true)}>
            <Plus size={16} /> Register venue
          </PrimaryButton>
        }
      />

      {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mb-5">{error}</p>}

      {loading ? (
        <EmptyState title="Loading venues" body="Fetching venues registered by your organisation." />
      ) : venues.length === 0 ? (
        <EmptyState title="No venues registered" body="Register a venue to make it discoverable to players." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {venues.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl p-5 stitch-border">
              <div className="flex items-center justify-between mb-3">
                <Badge tone="navy">{v.supportedSports.join(", ")}</Badge>
                <span className="scoreboard text-xs text-ink-soft">ID {v.id.slice(0, 8)}</span>
              </div>
              <p className="font-display text-xl tracking-wide">{v.name}</p>
              <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1"><MapPin size={14} /> {v.location}</p>
              <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1"><IndianRupee size={14} /> {v.pricePerHour}/hr</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {v.facilities.map((facility) => <Badge key={facility} tone="neutral">{facility}</Badge>)}
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mt-4 mb-2">Availability slots</p>
              <div className="flex flex-wrap gap-2">
                {SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => updateAvailability(v, slot)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                      v.availability.includes(slot) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Register a venue">
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Venue name" className="fld" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <ChoiceGroup title="Supported sports" items={SPORTS} active={form.supportedSports} onToggle={(item) => toggleFormArray("supportedSports", item)} />
          <input required placeholder="Location (area, city)" className="fld" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input required type="number" min="0" placeholder="Price per hour (Rs)" className="fld" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} />
          <ChoiceGroup title="Facilities" items={FACILITIES} active={form.facilities} onToggle={(item) => toggleFormArray("facilities", item)} />
          <ChoiceGroup title="Availability" items={SLOTS} active={form.availability} onToggle={(item) => toggleFormArray("availability", item)} />
          <PrimaryButton disabled={saving} type="submit" className="w-full mt-2">Publish venue</PrimaryButton>
        </form>
        <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
      </Modal>
    </div>
  );
}

function ChoiceGroup({ title, items, active, onToggle }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onToggle(item)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${
              active.includes(item) ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
