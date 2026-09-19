import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import FriendChatModal from "../../components/FriendChatModal";

export default function Friends() {
  const { friendPlayers, respondFriendRequest, removeFriend } = useApp();
  const [chatWith, setChatWith] = useState(null);

  const accepted = friendPlayers.filter((f) => f.status === "accepted");
  const incoming = friendPlayers.filter((f) => f.status === "pending_incoming");
  const outgoing = friendPlayers.filter((f) => f.status === "pending_outgoing");

  return (
    <div>
      <SectionHeading eyebrow="Social Module · FR-09" title="Friends" />

      {incoming.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Requests waiting on you</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {incoming.map(({ player }) => (
              <div key={player.id} className="bg-white rounded-2xl p-4 stitch-border flex items-center justify-between">
                <PlayerRow player={player} />
                <div className="flex gap-2">
                  <PrimaryButton className="!px-3 !py-1.5 text-xs" onClick={() => respondFriendRequest(player.id, true)}>Accept</PrimaryButton>
                  <GhostButton className="!px-3 !py-1.5 text-xs" onClick={() => respondFriendRequest(player.id, false)}>Decline</GhostButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Your friends ({accepted.length})</p>
        {accepted.length === 0 ? (
          <EmptyState title="No friends yet" body="Accept a match from Find Players to start building your circle." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {accepted.map(({ player }) => (
              <div key={player.id} className="bg-white rounded-2xl p-4 stitch-border flex items-center justify-between">
                <PlayerRow player={player} />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChatWith(player)}
                    className="flex items-center gap-1 text-xs font-semibold text-turf"
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                  <button onClick={() => removeFriend(player.id)} className="text-xs font-semibold text-clay">
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
        <p className="text-sm font-semibold">{player.name}</p>
        <p className="text-xs text-ink-soft">{player.sports.join(", ")}</p>
      </div>
    </div>
  );
}
