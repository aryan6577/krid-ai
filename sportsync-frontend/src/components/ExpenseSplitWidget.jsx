import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { Badge, GhostButton, PrimaryButton } from "./ui";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";

export default function ExpenseSplitWidget({ bookingId, defaultAmount = 0, defaultParticipantIds = [] }) {
  const { session } = useApp();
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [participantText, setParticipantText] = useState(defaultParticipantIds.join(", "));
  const [split, setSplit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit = bookingId && Number(amount) > 0;
  const progress = useMemo(() => {
    if (!split?.totalAmount) return 0;
    return Math.round((split.paidAmount / split.totalAmount) * 100);
  }, [split]);
  const fieldClass =
    "w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-turf";

  useEffect(() => {
    setAmount(defaultAmount ? String(defaultAmount) : "");
  }, [defaultAmount]);

  useEffect(() => {
    setParticipantText(defaultParticipantIds.join(", "));
  }, [defaultParticipantIds]);

  useEffect(() => {
    if (!bookingId || !session.accessToken) return;
    let cancelled = false;
    setLoading(true);
    api
      .getBookingExpenseShares(session.accessToken, bookingId)
      .then((data) => {
        if (!cancelled && data.shares?.length) setSplit(data);
      })
      .catch(() => {
        if (!cancelled) setSplit(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, session.accessToken]);

  const participantIds = () =>
    participantText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const recalculate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await api.splitBookingExpense(session.accessToken, bookingId, {
        amount: Number(amount),
        participants: participantIds(),
      });
      setSplit(data);
      setMessage(`Split across ${data.shares.length} player${data.shares.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setMessage(err.message || "Could not calculate expense split.");
    } finally {
      setLoading(false);
    }
  };

  const setShareStatus = async (playerId, status) => {
    setLoading(true);
    setMessage("");
    try {
      const data = await api.updateBookingExpenseShare(session.accessToken, bookingId, playerId, status);
      setSplit(data);
    } catch (err) {
      setMessage(err.message || "Could not update settlement status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-left bg-paper-dim rounded-xl p-4 mt-2 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">Expense Split</p>
        {split?.shares?.length ? <Badge tone={progress === 100 ? "turf" : "gold"}>{progress}% settled</Badge> : null}
      </div>

      <div className="grid sm:grid-cols-[1fr_1.35fr] gap-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Total</span>
          <input
            className={`${fieldClass} mt-1`}
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Total amount"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-soft">Participants</span>
          <input
            className={`${fieldClass} mt-1`}
            value={participantText}
            onChange={(event) => setParticipantText(event.target.value)}
            placeholder="Player IDs, comma-separated"
          />
        </label>
      </div>

      <PrimaryButton disabled={!canSubmit || loading} className="w-full" onClick={recalculate}>
        {loading ? "Updating split..." : "Calculate shares"}
      </PrimaryButton>

      {split?.shares?.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span className="text-xs text-ink-soft">Per player</span>
            <span className="font-semibold flex items-center gap-1">
              <IndianRupee size={14} />
              {split.perPlayerShare.toLocaleString("en-IN")}
            </span>
          </div>
          {split.shares.map((share) => (
            <div key={share.playerId} className="rounded-xl bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{share.player?.name || share.playerId}</p>
                  <p className="text-xs text-ink-soft">Rs {share.amount.toLocaleString("en-IN")}</p>
                </div>
                <Badge tone={share.status === "paid" ? "turf" : "clay"}>{share.status}</Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <GhostButton
                  className="flex-1 px-3 py-1.5 text-xs"
                  disabled={loading || share.status === "paid"}
                  onClick={() => setShareStatus(share.playerId, "paid")}
                >
                  <CheckCircle2 size={14} className="inline mr-1" />
                  Paid
                </GhostButton>
                <GhostButton
                  className="flex-1 px-3 py-1.5 text-xs"
                  disabled={loading || share.status === "pending"}
                  onClick={() => setShareStatus(share.playerId, "pending")}
                >
                  Pending
                </GhostButton>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>Paid Rs {split.paidAmount.toLocaleString("en-IN")}</span>
            <span>Pending Rs {split.pendingAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      ) : loading ? (
        <p className="text-xs text-ink-soft flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-turf" />
          Loading split
        </p>
      ) : (
        <p className="text-xs text-ink-soft">
          Add participant player IDs to calculate equal shares. Your own paid share is included automatically.
        </p>
      )}

      {message && <p className="text-xs text-ink-soft">{message}</p>}
    </div>
  );
}
