import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bot, CheckCircle2, MessageCircle, Send, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { venues } from "../data/venues";
import { chatWithAssistant, checkHealth } from "../lib/aiChat";
import { executeTool } from "../lib/assistantTools";
import { getQuickReplies } from "../lib/quickReplies";
import { getBotReply, botWelcomeMessage } from "../lib/chatbot";
import { api } from "../lib/api";

const MAX_TOOL_ROUNDS = 3;
const HEALTH_CHECK_INTERVAL = 15000;

export default function ChatWidget() {
  const {
    role,
    currentPlayer,
    currentOrganisation,
    gamesState,
    friendPlayers,
    fundingOpportunities,
    careerOpportunities,
    sponsorshipDeals,
    session,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: "bot", text: botWelcomeMessage }]);
  const [history, setHistory] = useState([]); // OpenAI-format conversation sent to the backend
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [confirmingProposalId, setConfirmingProposalId] = useState(null);
  const [confirmedProposalIds, setConfirmedProposalIds] = useState(() => new Set());
  const [offline, setOffline] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener("open-krid-assistant", openAssistant);
    return () => window.removeEventListener("open-krid-assistant", openAssistant);
  }, []);

  // Proactively track backend availability so the widget shows an accurate status
  // instead of only discovering a problem after a failed send.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await checkHealth();
      if (!cancelled) setOffline(!ok);
    };
    run();
    const id = setInterval(run, HEALTH_CHECK_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const buildContext = () => ({
    role,
    player:
      role === "organisation"
        ? undefined
        : { name: currentPlayer.name, sports: currentPlayer.sports, rating: currentPlayer.rating, location: currentPlayer.location },
    organisation:
      role === "organisation" ? { name: currentOrganisation.name, location: currentOrganisation.location } : undefined,
    venues: venues.map((v) => ({ id: v.id, name: v.name, sport: v.sport, location: v.location, pricePerHour: v.pricePerHour, sample: true })),
    games: gamesState
      .filter((g) => g.status === "Open")
      .map((g) => ({ id: g.id, sport: g.sport, venue: g.venue, date: g.date, time: g.time, capacity: g.capacity, joined: g.participants.length, sample: String(g.id).startsWith("g20") })),
    friends: friendPlayers
      .filter((f) => f.status === "accepted" && f.player)
      .map((f) => ({ name: f.player.name, sports: f.player.sports })),
    funding: fundingOpportunities.map((o) => ({ id: o.id, provider: o.provider, purpose: o.purpose, amountRange: o.amountRange, deadline: o.deadline, tags: o.tags, sample: true })),
    career: careerOpportunities.map((o) => ({ id: o.id, title: o.title, orgName: o.orgName, sport: o.sport, minRating: o.minRating, stipend: o.stipend, deadline: o.deadline, sample: String(o.id).startsWith("co") })),
    sponsorships: sponsorshipDeals.map((d) => ({ id: d.id, brand: d.brand, type: d.type, sport: d.sport, value: d.value, minRating: d.minRating, deadline: d.deadline, sample: true })),
  });

  const toolCtx = { token: session.accessToken };

  // Recursively: send conversation to the backend, execute any requested tool calls locally,
  // feed the results back, and repeat until the model gives a plain text reply.
  const runConversation = async (convo, depth = 0, latestProposal = null) => {
    if (depth > MAX_TOOL_ROUNDS) {
      return { text: "Sorry, I couldn't finish that action — could you try rephrasing?", proposal: latestProposal };
    }
    const { message } = await chatWithAssistant(convo, buildContext());

    if (message.tool_calls?.length) {
      const toolResults = [];
      let proposal = latestProposal;
      for (const call of message.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          /* ignore malformed args */
        }
        const result = await executeTool(call.function.name, args, toolCtx);
        if (result.proposal) proposal = result.proposal;
        toolResults.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: JSON.stringify(result) });
      }
      const nextConvo = [...convo, message, ...toolResults];
      setHistory(nextConvo);
      return runConversation(nextConvo, depth + 1, proposal);
    }

    const finalConvo = [...convo, { role: "assistant", content: message.content || "" }];
    setHistory(finalConvo);
    return { text: message.content || "Done!", proposal: latestProposal };
  };

  const send = async (textOverride) => {
    const text = (textOverride ?? draft).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { from: "me", text }]);
    setDraft("");
    setTyping(true);

    const newHistory = [...history, { role: "user", content: text }];
    setHistory(newHistory);

    try {
      const reply = await runConversation(newHistory);
      setOffline(false);
      setMessages((prev) => [...prev, { from: "bot", text: reply.text, proposal: reply.proposal }]);
    } catch (err) {
      // Backend unreachable / misconfigured — fall back to the lightweight rule-based bot
      // so the widget still feels responsive, and flag the connection issue.
      setOffline(true);
      setMessages((prev) => [...prev, { from: "bot", text: getBotReply(text) }]);
    } finally {
      setTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send();
  };

  const confirmProposal = async (proposal) => {
    const venue = proposal.venues?.[0];
    if (!venue) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "I can’t create this match because the proposal has no venue option attached." },
      ]);
      return;
    }
    setConfirmingProposalId(proposal.id);
    try {
      const data = await api.confirmAssistantMatchProposal(session.accessToken, proposal.id, {
        confirmed: true,
        venueId: venue.id,
        capacity: proposal.capacity || 10,
      });
      setConfirmedProposalIds((prev) => new Set(prev).add(proposal.id));
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: `Match created for ${data.game.sport} at ${venue.name}. No venue booking or payment was created by the assistant.`,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: err.message || "Could not confirm that proposal." },
      ]);
    } finally {
      setConfirmingProposalId(null);
    }
  };

  const lastBotText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === "bot") return messages[i].text;
    }
    return "";
  }, [messages]);

  const quickReplies = useMemo(
    () =>
      getQuickReplies({
        lastBotText,
        role,
        currentPlayer,
        venues,
        friendPlayers,
        funding: fundingOpportunities,
        career: careerOpportunities,
        sponsorships: sponsorshipDeals,
      }),
    [lastBotText, role, currentPlayer, friendPlayers, fundingOpportunities, careerOpportunities, sponsorshipDeals]
  );

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[22rem] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl overflow-hidden stitch-border flex flex-col" style={{ height: "30rem" }}>
          <div className="bg-turf-deep text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold text-turf-deep flex items-center justify-center">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Krid.ai Assistant</p>
                <p className="text-[10px] text-white/60 leading-tight flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${offline ? "bg-clay" : "bg-turf"}`} />
                  {offline ? "Offline mode" : "Powered by Groq (Llama 3.1)"}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition">
              <X size={16} />
            </button>
          </div>

          {offline && (
            <div className="px-3 py-1.5 bg-gold/20 text-[11px] text-clay-deep flex items-center gap-1.5 shrink-0">
              <AlertCircle size={12} /> Can't reach the AI backend right now — using basic offline replies.
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-paper">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.from === "me" ? "bg-clay text-white rounded-br-sm" : "bg-white text-ink stitch-border rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.proposal && (
                    <ProposalCard
                      proposal={m.proposal}
                      confirming={confirmingProposalId === m.proposal.id}
                      confirmed={confirmedProposalIds.has(m.proposal.id)}
                      onConfirm={() => confirmProposal(m.proposal)}
                    />
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white stitch-border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-ink-soft">
                  thinking…
                </div>
              </div>
            )}
          </div>

          {!typing && quickReplies.length > 0 && (
            <div className="px-2.5 pt-2 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-white border-t border-ink/10">
              {quickReplies.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="shrink-0 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border border-turf text-turf-deep hover:bg-turf-light transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-2.5 border-t border-ink/10 flex items-center gap-2 shrink-0 bg-white">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Plan a match, find players, ask about funding…"
              className="flex-1 px-3 py-2 rounded-full border border-ink/15 text-sm focus:outline-none focus:ring-2 focus:ring-turf"
            />
            <button
              type="submit"
              disabled={!draft.trim() || typing}
              className="w-9 h-9 shrink-0 rounded-full bg-turf-deep text-white flex items-center justify-center disabled:opacity-40 transition"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-clay hover:bg-clay-deep text-white shadow-xl flex items-center justify-center transition"
        title="Krid.ai Assistant"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}

function ProposalCard({ proposal, confirming, confirmed, onConfirm }) {
  const venue = proposal.venues?.[0];
  const players = proposal.candidates?.slice(0, 3) || [];
  const dateLabel = [proposal.date, proposal.time].filter(Boolean).join(" at ");

  return (
    <div className="bg-white stitch-border rounded-xl p-3 text-xs text-ink space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{proposal.sport} proposal</p>
          <p className="text-ink-soft">{dateLabel || proposal.dateTime}</p>
        </div>
        <span className="rounded-full bg-gold-light text-[#7A5A0E] px-2 py-0.5 font-semibold">Confirm needed</span>
      </div>
      {players.length > 0 && (
        <div>
          <p className="font-semibold text-ink-soft uppercase tracking-widest text-[10px]">Players</p>
          <p>{players.map((candidate) => candidate.player?.name || "Player").join(", ")}</p>
        </div>
      )}
      {venue && (
        <div>
          <p className="font-semibold text-ink-soft uppercase tracking-widest text-[10px]">Venue option</p>
          <p>
            {venue.name} {venue.score ? `· ${venue.score}% fit` : ""}
          </p>
        </div>
      )}
      <p className="text-ink-soft">
        This will create a match only. The assistant will not book the venue or process payment.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming || confirmed || !venue}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-turf-deep text-white font-semibold px-3 py-2 disabled:opacity-50"
      >
        <CheckCircle2 size={14} /> {confirmed ? "Match created" : confirming ? "Creating..." : "Create match"}
      </button>
    </div>
  );
}
