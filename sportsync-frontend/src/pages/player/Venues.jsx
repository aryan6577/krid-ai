import { useEffect, useState } from "react";
import { MapPin, IndianRupee, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import ExpenseSplitWidget from "../../components/ExpenseSplitWidget";
import WeatherWidget from "../../components/WeatherWidget";
import { SectionHeading, Badge, PrimaryButton, GhostButton, Modal, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

const SPORTS = ["Football", "Badminton", "Tennis", "Basketball"];
const SLOTS = ["", "Weekday Mornings", "Weekday Evenings", "Sunday Morning", "Weekend Evenings"];

export default function Venues() {
  const { session, currentPlayer, pushNotification } = useApp();
  const [sport, setSport] = useState(currentPlayer.sports[0] || "Football");
  const [budget, setBudget] = useState(1500);
  const [location, setLocation] = useState("");
  const [availability, setAvailability] = useState("");
  const [venues, setVenues] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [bookingWeather, setBookingWeather] = useState(null);
  const [booking, setBooking] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [pending, setPending] = useState(null);
  const [payStep, setPayStep] = useState("review");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState("");

  const loadMyBookings = async () => {
    try { const data = await api.getMyBookings(session.accessToken); setMyBookings(data.bookings || []); setBookingsError(""); }
    catch (err) { setBookingsError(err.message || "Could not load your bookings."); }
  };

  const loadVenues = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.discoverVenues(session.accessToken, {
        sport,
        location,
        maxPrice: budget,
        availability,
      });
      setVenues(data.venues || []);
    } catch (err) {
      setError(err.message || "Could not discover venues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.accessToken) loadVenues();
  }, [session.accessToken, sport, budget, location, availability]);

  useEffect(() => { if (session.accessToken) loadMyBookings(); }, [session.accessToken]);

  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(Boolean(session.accessToken && (location || currentPlayer.location)));
    async function loadWeather() {
      try {
        const data = await api.getWeather(session.accessToken, location ? { location } : {});
        if (!cancelled) setWeather(data.weather);
      } catch {
        if (!cancelled) {
          setWeather({
            status: "unavailable",
            location: { label: location || currentPlayer.location },
            current: null,
            forecast: [],
            message: "Weather service is unavailable.",
            advisory: "Weather is advisory only and never blocks booking.",
          });
        }
      } finally { if (!cancelled) setWeatherLoading(false); }
    }
    const timer = session.accessToken && (location || currentPlayer.location)
      ? setTimeout(loadWeather, location ? 350 : 0)
      : null;
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [session.accessToken, location, currentPlayer.location]);

  const startBooking = (venue) => {
    setBooking(venue);
    setSelectedSlot(availability || venue.availability[0] || "");
    setPending(null);
    setPayStep("review");
    setPaymentMessage("");
    setBookingWeather(null);
    loadVenueWeather(venue);
  };

  const loadVenueWeather = async (venue) => {
    try {
      const data = await api.getWeather(session.accessToken, { venueId: venue.id });
      setBookingWeather(data.weather);
    } catch {
      setBookingWeather({
        status: "unavailable",
        location: { label: venue.location },
        current: null,
        forecast: [],
        message: "Venue weather is unavailable.",
        advisory: "Weather is advisory only and never blocks booking.",
      });
    }
  };

  const createPendingBooking = async () => {
    setError("");
    try {
      const data = await api.createBooking(session.accessToken, {
        venueId: booking.id,
        slot: selectedSlot,
      });
      setPending(data);
      return data;
    } catch (err) {
      setError(err.message || "Could not create booking.");
      throw err;
    }
  };

  const pay = async () => {
    setPayStep("processing");
    setPaymentMessage("");
    try {
      if (booking.demo) {
        const data = pending || await createPendingBooking();
        setPending(data);
        setPaymentMessage(data.message || "Demo booking saved. No real time or payment was reserved.");
        setPayStep("demo");
        await loadMyBookings();
        return;
      }
      const data = pending || (await createPendingBooking());
      const order = await api.createPaymentOrder(session.accessToken, data.booking.id);
      setPending({ ...data, payment: order.payment, booking: order.booking || data.booking });

      if (order.paymentStatus === "verified") {
        setPayStep("success");
        return;
      }

      if (order.providerUnavailable || !order.razorpayKeyId || !order.payment?.providerOrderId) {
        setPaymentMessage(order.message || "Payment provider unavailable. Booking remains pending/unpaid.");
        setPayStep("unavailable");
        return;
      }

      await openRazorpayCheckout({
        key: order.razorpayKeyId,
        amount: order.payment.amount,
        orderId: order.payment.providerOrderId,
        venueName: data.booking.venue.name,
        onSuccess: async (response) => {
          const result = await api.verifyRazorpayPayment(session.accessToken, {
            bookingId: data.booking.id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setPending({ ...data, booking: result.booking, payment: result.payment });
          setPayStep("success");
          pushNotification({
            type: "payment",
            text: `Payment of Rs ${result.booking.amount} verified for ${result.booking.venue.name} (Razorpay test mode).`,
          });
        },
        onDismiss: () => {
          setPaymentMessage("Payment was not completed. Booking remains pending/unpaid.");
          setPayStep("unavailable");
        },
      });
    } catch (err) {
      setError(err.message || "Could not start payment.");
      setPayStep("review");
    }
  };

  return (
    <div>
      <SectionHeading
        eyebrow="Venue discovery"
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

      <div className="bg-white rounded-2xl p-5 stitch-border mb-6 grid lg:grid-cols-[1fr_180px_220px] gap-4 items-end">
        <div>
          <label htmlFor="venue-location-filter" className="block text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Location filter</label>
          <input id="venue-location-filter"
            className="fld"
            placeholder="Area or city"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <p className="text-sm font-semibold whitespace-nowrap mb-2">Budget: Rs {budget}/hr</p>
          <input type="range" min="300" max="3000" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full accent-turf" />
        </div>
        <div>
          <label htmlFor="venue-availability-filter" className="block text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Availability</label>
          <select id="venue-availability-filter" className="fld" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            {SLOTS.map((slot) => <option key={slot} value={slot}>{slot || "Any slot"}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <WeatherWidget weather={weather} loading={weatherLoading} title="Play weather" />
      </div>

      {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mb-5">{error}</p>}

      {loading ? (
        <EmptyState title="Ranking venues" body="Scoring by distance, cost, availability, and sport suitability." />
      ) : venues.length === 0 ? (
        <EmptyState title="No live venues found" body="Try widening your filters or check back after organisations register venues." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {venues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-2xl p-5 stitch-border">
              <div className="flex items-center justify-between mb-3">
                <Badge tone={venue.bestMatch ? "turf" : "neutral"}>{venue.bestMatch ? "Best match" : `${venue.score}% fit`}</Badge>
                {venue.demo ? <Badge tone="gold">Demo venue</Badge> : <Badge tone="gold">{venue.score}% fit</Badge>}
              </div>
              <p className="font-display text-xl tracking-wide">{venue.name}</p>
              <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                <MapPin size={14} /> {venue.location} · {venue.distanceKm == null ? "distance n/a" : `${venue.distanceKm.toFixed(1)}km`}
              </p>
              <p className="text-sm text-ink-soft mt-1">
                {travelLine(venue.travelContext)}
              </p>
              <p className="text-sm text-ink-soft flex items-center gap-1.5 mt-1">
                <IndianRupee size={14} /> {venue.pricePerHour}/hr
              </p>
              {venue.demo && <p className="text-xs text-ink-soft mt-2">Illustrative price and slots. You can save a demo booking; no real venue time or payment is reserved.</p>}
              <div className="flex flex-wrap gap-1.5 my-3">
                {venue.facilities.map((facility) => <Badge key={facility} tone="neutral">{facility}</Badge>)}
              </div>
              <div className="space-y-1 mb-4">
                {venue.reasons.map((reason) => (
                  <p key={reason} className="text-xs flex items-center gap-1.5 text-ink-soft">
                    <Sparkles size={12} className="text-clay" /> {reason}
                  </p>
                ))}
              </div>
              <PrimaryButton className="w-full" onClick={() => startBooking(venue)}>{venue.demo ? "Choose demo venue" : "Book & pay"}</PrimaryButton>
            </div>
          ))}
        </div>
      )}

      <section className="mt-8" aria-labelledby="my-bookings-heading"><h2 id="my-bookings-heading" className="font-display text-xl mb-2">Your venue choices</h2>{bookingsError && <p role="status" className="text-sm text-clay-deep mb-2">{bookingsError}</p>}{myBookings.length === 0 ? <p className="text-sm text-ink-soft">No venue bookings saved yet.</p> : <div className="grid sm:grid-cols-2 gap-3">{myBookings.map((item) => <article key={item.id} className="bg-white rounded-xl p-4 stitch-border"><Badge tone={item.demo ? "gold" : item.status === "confirmed" ? "turf" : "neutral"}>{item.demo ? "Demo booking" : item.status}</Badge><h3 className="font-semibold mt-2">{item.venue?.name || item.venueId}</h3><p className="text-sm text-ink-soft">{item.slot}</p>{item.demo && <p className="text-xs text-ink-soft mt-1">Saved example only. No real time or payment reserved.</p>}</article>)}</div>}</section>

      <Modal open={!!booking} onClose={() => setBooking(null)} title="Confirm booking">
        {booking && payStep === "review" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-paper-dim">
              <p className="font-display text-lg tracking-wide">{booking.name}</p>
              <p className="text-sm text-ink-soft">{booking.location}</p>
              <p className="text-sm text-ink-soft mt-2">1 hour slot · Rs {booking.pricePerHour}</p>
              <p className="text-xs text-ink-soft mt-2">{travelLine(booking.travelContext)}</p>
            </div>
            <WeatherWidget weather={bookingWeather} title="Venue weather" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Slot</p>
              <select className="fld" value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} required>
                <option value="">Select slot</option>
                {booking.availability.map((slot) => <option key={slot}>{slot}</option>)}
              </select>
            </div>
            <p className="text-xs text-ink-soft">
              {booking.demo ? "This saves a demo booking only. No real venue time is held and no payment is taken." : "Payment uses Razorpay test mode. The booking stays pending until the server verifies Razorpay's signed response."}
            </p>
            <PrimaryButton disabled={!selectedSlot} className="w-full" onClick={pay}>{booking.demo ? "Save demo booking" : `Pay Rs ${booking.pricePerHour} with Razorpay test mode`}</PrimaryButton>
          </div>
        )}
        {booking && payStep === "processing" && (
          <div className="py-10 flex flex-col items-center gap-3 text-ink-soft">
            <Loader2 className="animate-spin text-turf" size={28} />
            <p className="text-sm">Creating a server-side Razorpay order...</p>
          </div>
        )}
        {booking && payStep === "demo" && pending?.booking && <div className="py-6 flex flex-col items-center gap-3 text-center"><CheckCircle2 className="text-turf" size={40} /><p className="font-display text-xl tracking-wide">Demo booking saved</p><p className="text-sm text-ink-soft">{pending.booking.venue?.name || booking.name} · {pending.booking.slot}</p><p role="status" className="text-xs text-ink-soft bg-paper-dim rounded-xl p-3">{paymentMessage}</p><GhostButton onClick={() => setBooking(null)}>Done</GhostButton></div>}
        {booking && payStep === "unavailable" && pending?.booking && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="font-display text-xl tracking-wide">Booking pending</p>
            <p className="text-sm text-ink-soft">
              {pending.booking.venue.name} · Rs {pending.booking.amount}
            </p>
            <p className="text-xs text-ink-soft bg-paper-dim rounded-xl px-3 py-2">
              {paymentMessage || "Payment is unavailable or incomplete. No confirmation was recorded."}
            </p>
            <div className="flex gap-2">
              <PrimaryButton onClick={pay}>Retry payment</PrimaryButton>
              <GhostButton onClick={() => setBooking(null)}>Close</GhostButton>
            </div>
          </div>
        )}
        {booking && payStep === "success" && pending?.booking && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="text-turf" size={40} />
            <p className="font-display text-xl tracking-wide">Booking confirmed</p>
            <p className="text-sm text-ink-soft">
              {pending.booking.venue.name} · Rs {pending.booking.amount} · {pending.payment?.providerOrderId || pending.payment?.gatewayReference}
            </p>
            <ExpenseSplitWidget bookingId={pending.booking.id} defaultAmount={pending.booking.amount} />
            <GhostButton onClick={() => setBooking(null)}>Done</GhostButton>
          </div>
        )}
        <style>{`.fld { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
      </Modal>
    </div>
  );
}

function travelLine(travel) {
  if (!travel) return "Travel time unavailable";
  if (travel.status === "current" || travel.status === "stale") {
    const state = travel.status === "stale" ? "stale estimate" : "estimate";
    return `${travel.durationMinutes} min drive ${state} · ${travel.distanceKm} km route`;
  }
  if (travel.straightLineDistanceKm != null) {
    return `Travel time unavailable · ${travel.straightLineDistanceKm} km direct distance`;
  }
  return "Travel time unavailable";
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay-checkout]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

async function openRazorpayCheckout({ key, amount, orderId, venueName, onSuccess, onDismiss }) {
  await loadRazorpayCheckout();
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key,
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      name: "Krid.ai",
      description: `Venue booking: ${venueName}`,
      order_id: orderId,
      handler: async (response) => {
        try {
          await onSuccess(response);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          onDismiss();
          resolve();
        },
      },
      theme: { color: "#1F6F4A" },
    });
    checkout.open();
  });
}
