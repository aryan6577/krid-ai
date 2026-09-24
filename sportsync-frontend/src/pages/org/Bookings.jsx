import { useEffect, useState } from "react";
import { SectionHeading, Badge, ScoreboardStat, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";

export default function OrgBookings() {
  const { session } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadBookings() {
      setLoading(true);
      setError("");
      try {
        const data = await api.getOrgBookings(session.accessToken);
        if (!cancelled) setBookings(data.bookings || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load bookings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (session.accessToken) loadBookings();
    return () => {
      cancelled = true;
    };
  }, [session.accessToken]);

  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const pending = bookings.filter((booking) => booking.status === "pending");
  const revenue = confirmed.reduce((sum, booking) => sum + booking.amount, 0);

  return (
    <div>
      <SectionHeading
        eyebrow="Payments"
        title="Bookings & payments"
        action={
          <div className="flex gap-3">
            <ScoreboardStat label="Confirmed" value={confirmed.length} />
            <ScoreboardStat label="Pending" value={pending.length} />
            <ScoreboardStat label="Revenue" value={`Rs ${revenue}`} />
          </div>
        }
      />
      {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mb-5">{error}</p>}
      {loading ? (
        <EmptyState title="Loading bookings" body="Fetching venue bookings and payment status." />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet" body="Confirmed and pending bookings will appear here." />
      ) : (
        <div className="bg-white rounded-2xl stitch-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-dim text-left text-xs uppercase tracking-widest text-ink-soft">
              <tr>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="py-3 px-4 font-medium">{booking.venue?.name || booking.venueId}</td>
                  <td className="py-3 px-4 text-ink-soft">{booking.player?.name || booking.playerId}</td>
                  <td className="py-3 px-4 text-ink-soft">{booking.slot}</td>
                  <td className="py-3 px-4 scoreboard">Rs {booking.amount}</td>
                  <td className="py-3 px-4">
                    <Badge tone={booking.status === "confirmed" ? "turf" : booking.status === "pending" ? "gold" : "clay"}>
                      {booking.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-soft/70 mt-4">
        Bookings become confirmed only after the backend verifies the sandbox payment record.
      </p>
    </div>
  );
}
