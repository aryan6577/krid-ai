import { useMemo, useState } from "react";
import { MapPin, IndianRupee, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, Modal } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { venues } from "../../data/venues";
import { rankVenues } from "../../lib/ai";
import WeatherChip from "../../components/WeatherChip";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];

export default function Venues() {
  const { currentPlayer, pushNotification } = useApp();
  const [sport, setSport] = useState("Football");
  const [budget, setBudget] = useState(1500);
  const [booking, setBooking] = useState(null); // venue being booked
  const [payStep, setPayStep] = useState("review"); // review | processing | success

  const ranked = useMemo(() => rankVenues(currentPlayer, venues, { sport, budget }), [currentPlayer, sport, budget]);

  const startBooking = (venue) => {
    setBooking(venue);
    setPayStep("review");
  };

  const pay = () => {
    setPayStep("processing");
    setTimeout(() => {
      setPayStep("success");
      pushNotification({ type: "payment", text: `Payment of ₹${booking.pricePerHour} confirmed for ${booking.name} (Razorpay sandbox).` });
    }, 1400);
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Venue Module · FR-15 / FR-16"
        title="Find a venue"
        action={
          <div className="flex gap-2 flex-wrap">
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
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

      <div className="bg-white rounded-2xl p-5 stitch-border mb-6 flex items-center gap-4 flex-wrap">
        <p className="text-sm font-semibold whitespace-nowrap">Budget: ₹{budget}/hr</p>
        <input type="range" min="300" max="2000" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="flex-1 min-w-[160px] accent-turf" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {ranked.map(({ venue, score, reasons, travelMins }, idx) => (
          <div key={venue.id} className="bg-white rounded-2xl p-5 stitch-border">
            <div className="flex items-center justify-between mb-3">
              <Badge tone={idx === 0 ? "turf" : "neutral"}>{idx === 0 ? "Top pick" : `#${idx + 1}`}</Badge>
              <Badge tone="gold">{score}% fit</Badge>
            </div>
            <p className="font-display text-xl tracking-wide">{venue.name}</p>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
              <MapPin size={14} /> {venue.location} · ~{travelMins} min travel
            </p>
            <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
              <IndianRupee size={14} /> {venue.pricePerHour}/hr · {venue.rating}★
            </p>
            <div className="mt-1.5">
              <WeatherChip lat={venue.lat} lng={venue.lng} />
            </div>
            <div className="flex flex-wrap gap-1.5 my-3">
              {venue.facilities.map((f) => (
                <Badge key={f} tone="neutral">{f}</Badge>
              ))}
            </div>
            <div className="space-y-1 mb-4">
              {reasons.map((r, i) => (
                <p key={i} className="text-xs flex items-center gap-1.5 text-ink-soft">
                  <Sparkles size={12} className="text-clay" /> {r}
                </p>
              ))}
            </div>
            <PrimaryButton className="w-full" onClick={() => startBooking(venue)}>Book & pay</PrimaryButton>
          </div>
        ))}
      </div>

      <Modal open={!!booking} onClose={() => setBooking(null)} title="Confirm booking">
        {booking && payStep === "review" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-paper-dim">
              <p className="font-display text-lg tracking-wide">{booking.name}</p>
              <p className="text-sm text-ink-soft">{booking.location}</p>
              <p className="text-sm text-ink-soft mt-2">1 hour slot · ₹{booking.pricePerHour}</p>
            </div>
            <p className="text-xs text-ink-soft">
              Payment processed via Razorpay <strong>test/sandbox mode</strong> for this prototype (FR-18). No real
              money is charged.
            </p>
            <PrimaryButton className="w-full" onClick={pay}>Pay ₹{booking.pricePerHour} with Razorpay (sandbox)</PrimaryButton>
          </div>
        )}
        {booking && payStep === "processing" && (
          <div className="py-10 flex flex-col items-center gap-3 text-ink-soft">
            <Loader2 className="animate-spin text-turf" size={28} />
            <p className="text-sm">Confirming with payment gateway...</p>
          </div>
        )}
        {booking && payStep === "success" && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="text-turf" size={40} />
            <p className="font-display text-xl tracking-wide">Booking confirmed</p>
            <p className="text-sm text-ink-soft">{booking.name} · ₹{booking.pricePerHour} · Reference #SBX{booking.id.toUpperCase()}92X</p>
            <GhostButton onClick={() => setBooking(null)}>Done</GhostButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
