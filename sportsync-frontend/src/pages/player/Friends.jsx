import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionHeading, Badge, PrimaryButton, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import FriendChatModal from "../../components/FriendChatModal";
import { api } from "../../lib/api";

export default function Friends() {
  const { session } = useApp();
  const [friends, setFriends] = useState([]);
  const [chatWith, setChatWith] = useState(null);
  const [requestPlayerId, setRequestPlayerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFriends = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getFriends(session.accessToken);
      setFriends(data.friends || []);
    } catch (err) {
      setError(err.message || "Could not load friends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session.accessToken) loadFriends();
  }, [session.accessToken]);

  const accept = async (playerId) => {
    setError("");
    try {
      await api.acceptFriendRequest(session.accessToken, playerId);
      await loadFriends();
    } catch (err) {
      setError(err.message || "Could not accept request.");
    }
  };

  const remove = async (playerId) => {
    setError("");
    try {
      await api.removeFriend(session.accessToken, playerId);
      await loadFriends();
    } catch (err) {
      setError(err.message || "Could not remove connection.");
    }
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.sendFriendRequest(session.accessToken, requestPlayerId.trim());
      setRequestPlayerId("");
      await loadFriends();
    } catch (err) {
      setError(err.message || "Could not send friend request.");
    }
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const outgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");

  return (
    <div>
      <SectionHeading eyebrow="Friend management" title="Friends" />
      {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mb-5">{error}</p>}

      <form onSubmit={sendRequest} className="bg-white rounded-2xl p-4 stitch-border mb-8 flex flex-col sm:flex-row gap-3">
        <input
          required
          className="flex-1 px-4 py-2.5 rounded-xl border border-ink/15 bg-white focus:outline-none focus:ring-2 focus:ring-turf text-sm"
          placeholder="Player ID to request"
          value={requestPlayerId}
          onChange={(e) => setRequestPlayerId(e.target.value)}
        />
        <PrimaryButton type="submit" className="!py-2.5">
          Send request
        </PrimaryButton>
      </form>

      {incoming.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Requests waiting on you</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {incoming.map(({ player }) => (
              <div key={player.id} className="bg-white rounded-2xl p-4 stitch-border flex items-center justify-between">
                <PlayerRow player={player} />
                <div className="flex gap-2">
                  <PrimaryButton className="!px-3 !py-1.5 text-xs" onClick={() => accept(player.id)}>Accept</PrimaryButton>
                  <button onClick={() => remove(player.id)} className="text-xs font-semibold text-clay">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Your friends ({accepted.length})</p>
        {loading ? (
          <EmptyState title="Loading friends" body="Fetching your saved connections." />
        ) : accepted.length === 0 ? (
          <EmptyState title="No friends yet" body="Send or accept a friend request to start building your circle." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {accepted.map(({ player }) => (
              <div key={player.id} className="bg-white rounded-2xl p-4 stitch-border flex items-center justify-between">
                <PlayerRow player={player} />
                <div className="flex items-center gap-3">
                  {player.demo ? <Link to="/app/games" className="text-xs font-semibold text-turf underline">Plan demo game</Link> : <button onClick={() => setChatWith(player)} className="flex items-center gap-1 text-xs font-semibold text-turf"><MessageSquare size={14} /> Message</button>}
                  <button onClick={() => remove(player.id)} className="text-xs font-semibold text-clay">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {outgoing.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Sent requests</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {outgoing.map(({ player }) => (
              <div key={player.id} className="bg-white rounded-2xl p-4 stitch-border flex items-center justify-between opacity-80">
                <PlayerRow player={player} />
                <Badge tone="neutral">Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <FriendChatModal player={chatWith} onClose={() => setChatWith(null)} />
    </div>
  );
}

function PlayerRow({ player }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center">
        {player.avatar}
      </span>
      <div>
        <p className="text-sm font-semibold">{player.name} {player.demo && <Badge tone="gold">Demo teammate</Badge>}</p>
        <p className="text-xs text-ink-soft">{(player.sports || []).join(", ")}</p>
      </div>
    </div>
  );
}
