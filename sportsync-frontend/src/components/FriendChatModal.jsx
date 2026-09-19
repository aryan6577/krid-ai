import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function FriendChatModal({ player, onClose }) {
  const { friendChats, sendFriendMessage } = useApp();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);
  const messages = (player && friendChats[player.id]) || [];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  if (!player) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendFriendMessage(player.id, draft);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-paper rounded-2xl w-full max-w-md shadow-2xl flex flex-col" style={{ height: "30rem" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink/10 bg-white rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-turf-light text-turf-deep font-bold text-xs flex items-center justify-center">
              {player.avatar}
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">{player.name}</p>
              <p className="text-xs text-ink-soft leading-tight">{player.sports.join(", ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-ink/10 transition">
            <X size={18} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-ink-soft text-center mt-8">No messages yet — say hi!</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[78%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm ${
                      m.from === "me" ? "bg-clay text-white rounded-br-sm" : "bg-white stitch-border text-ink rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  <p className={`text-[10px] text-ink-soft/60 mt-0.5 ${m.from === "me" ? "text-right" : "text-left"}`}>{m.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-ink/10 flex items-center gap-2 shrink-0 bg-white rounded-b-2xl">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${player.name.split(" ")[0]}…`}
            className="flex-1 px-3.5 py-2.5 rounded-full border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-turf"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="w-10 h-10 shrink-0 rounded-full bg-turf-deep text-white flex items-center justify-center disabled:opacity-40 transition"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
