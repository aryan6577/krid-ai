import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Sparkles, Bookmark, EyeOff, MapPin, ExternalLink } from "lucide-react";
import { SectionHeading, Badge, GhostButton, EmptyState } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { recommendAlternativeSports } from "../../lib/altSports";

export default function AlternativeSports() {
  const { currentPlayer, savedAltSportIds, hiddenAltSportIds, saveAltSport, hideAltSport } = useApp();
  const [primarySport, setPrimarySport] = useState(currentPlayer.sports[0] || "Football");

  const candidates = useMemo(
    () => recommendAlternativeSports(primarySport, currentPlayer.sports, { limit: 5 }).filter((c) => !hiddenAltSportIds.includes(c.sport)),
    [primarySport, currentPlayer.sports, hiddenAltSportIds]
  );

  return (
    <div>
      <Link to="/app/coaching" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to coaching
      </Link>

      <SectionHeading
        eyebrow="Alternative Sports Recommendation · FR-84 / FR-85"
        title="Discover related sports"
        action={
          <div className="flex gap-2 flex-wrap">
            {currentPlayer.sports.map((s) => (
              <button
                key={s}
                onClick={() => setPrimarySport(s)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border-2 transition ${
                  primarySport === s ? "bg-turf border-turf text-white" : "border-ink/15 text-ink-soft"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        }
      />
      <p className="text-sm text-ink-soft max-w-2xl mb-6">
        Sports with similar movement demands to {primarySport}, based on a transparent attribute comparison — not a
        prediction that you'll succeed or reach a higher competitive level (BR-22).
      </p>

      {candidates.length === 0 ? (
        <EmptyState title="No candidates left" body="You've hidden every recommendation for this sport — try a different primary sport above." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {candidates.map((c) => {
            const saved = savedAltSportIds.includes(c.sport);
            return (
              <div key={c.sport} className="bg-white rounded-2xl p-5 stitch-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-display text-lg tracking-wide flex items-center gap-2">
                      <Compass size={16} className="text-turf" /> {c.sport}
                    </p>
                    <Badge tone={c.score >= 70 ? "turf" : c.score >= 50 ? "gold" : "neutral"}>{c.score}% similar</Badge>
                  </div>

                  {c.matchedAttributes.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {c.matchedAttributes.map((a) => (
                        <p key={a} className="text-xs flex items-center gap-1.5 text-clay">
                          <Sparkles size={11} /> Similar {a} to {primarySport}
                        </p>
                      ))}
                    </div>
                  )}

                  {c.opportunities.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-1.5">Nearby opportunities</p>
                      <div className="space-y-1.5">
                        {c.opportunities.map((o) => (
                          <div key={o.title} className="text-xs bg-paper-dim rounded-lg px-2.5 py-2">
                            <p className="font-semibold flex items-center gap-1"><ExternalLink size={11} /> {o.title}</p>
                            <p className="text-ink-soft flex items-center gap-1 mt-0.5"><MapPin size={10} /> {o.location} · {o.type}</p>
                            <p className="text-ink-soft/60 mt-0.5">Curated demo source · {o.retrievedAt}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <GhostButton
                    className={`!px-3 !py-1.5 text-xs flex items-center gap-1.5 flex-1 ${saved ? "!border-turf !text-turf" : ""}`}
                    onClick={() => saveAltSport(c.sport)}
                    disabled={saved}
                  >
                    <Bookmark size={13} /> {saved ? "Saved" : "Save"}
                  </GhostButton>
                  <button
                    onClick={() => hideAltSport(c.sport)}
                    className="text-xs font-semibold text-ink-soft flex items-center gap-1 px-3 py-1.5"
                  >
                    <EyeOff size={13} /> Hide
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {savedAltSportIds.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Saved for later</p>
          <div className="flex flex-wrap gap-2">
            {savedAltSportIds.map((s) => <Badge key={s} tone="turf">{s}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}
