import { SectionHeading, Badge, ScoreboardStat } from "../../components/ui";
import { orgBookings } from "../../data/venues";

export default function OrgBookings() {
  const confirmed = orgBookings.filter((b) => b.status === "Confirmed");
  const pending = orgBookings.filter((b) => b.status === "Pending");
  const revenue = confirmed.reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <SectionHeading
        eyebrow="Payments · FR-17 / FR-18"
        title="Bookings & payments"
        action={
          <div className="flex gap-3">
            <ScoreboardStat label="Confirmed" value={confirmed.length} />
            <ScoreboardStat label="Pending" value={pending.length} />
            <ScoreboardStat label="Revenue" value={`₹${revenue}`} />
          </div>
        }
      />
      <div className="bg-white rounded-2xl stitch-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-dim text-left text-xs uppercase tracking-widest text-ink-soft">
            <tr>
              <th className="py-3 px-4">Venue</th>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-4">Date & time</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {orgBookings.map((b) => (
              <tr key={b.id}>
                <td className="py-3 px-4 font-medium">{b.venueName}</td>
                <td className="py-3 px-4 text-ink-soft">{b.playerName}</td>
                <td className="py-3 px-4 text-ink-soft">{b.date} · {b.time}</td>
                <td className="py-3 px-4 scoreboard">₹{b.amount}</td>
                <td className="py-3 px-4">
                  <Badge tone={b.status === "Confirmed" ? "turf" : "gold"}>{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-soft/70 mt-4">
        Payment confirmation is based on the payment gateway response, not client-side input alone (BR-08).
      </p>
    </div>
  );
}
