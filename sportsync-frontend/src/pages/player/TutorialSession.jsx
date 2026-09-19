import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, X, Play, ThumbsDown, TrendingUp, ClipboardList } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { getTutorialById } from "../../data/tutorials";
import CameraPanel from "../../components/CameraPanel";

export default function TutorialSession() {
  const { drillId } = useParams();
  const navigate = useNavigate();
  const { completeTutorialSession, markTutorialFeedbackIncorrect, tutorialSessions } = useApp();
  const drill = getTutorialById(drillId);

  const [phase, setPhase] = useState("setup"); // setup | running | summary
  const [quality, setQuality] = useState("blocked");
  const [checkIndex, setCheckIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const intervalRef = useRef();

  const previousSessions = useMemo(
    () => tutorialSessions.filter((s) => s.drillId === drillId).slice(0, 3),
    [tutorialSessions, drillId]
  );

  useEffect(() => () => clearInterval(intervalRef.current), []);

  if (!drill) {
    return (
      <div>
        <p className="mb-4">Drill not found.</p>
        <GhostButton onClick={() => navigate("/app/coaching/tutorial")}>Back to Tutorial Mode</GhostButton>
      </div>
    );
  }

  const finish = (finalResults) => {
    clearInterval(intervalRef.current);
    const passed = finalResults.filter((r) => r.passed).length;
    const score = Math.round((passed / drill.checkpoints.length) * 100);
    const record = completeTutorialSession({
      drillId: drill.id,
      sport: drill.sport,
      drillName: drill.drillName,
      checkpointResults: finalResults,
      checkpointsPassed: passed,
      checkpointsTotal: drill.checkpoints.length,
      score,
    });
    setSummary(record);
    setPhase("summary");
  };

  const start = () => {
    setPhase("running");
    setCheckIndex(0);
    setResults([]);
    const collected = [];

    intervalRef.current = setInterval(() => {
      setQuality((currentQuality) => {
        if (currentQuality !== "good") return currentQuality; // pause while reframing
        setCheckIndex((idx) => {
          if (idx >= drill.checkpoints.length) return idx;
          const cp = drill.checkpoints[idx];
          const passed = Math.random() < 0.72;
          collected.push({ id: cp.id, label: cp.label, passed });
          setResults([...collected]);
          const nextIdx = idx + 1;
          if (nextIdx >= drill.checkpoints.length) finish(collected);
          return nextIdx;
        });
        return currentQuality;
      });
    }, 1600);
  };

  return (
    <div>
      <Link to="/app/coaching/tutorial" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to Tutorial Mode
      </Link>

      <SectionHeading eyebrow={`Tutorial Mode · ${drill.sport} · ${drill.cameraView} view`} title={drill.drillName} />

      {phase !== "summary" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <CameraPanel running={phase === "running"} onQualityChange={setQuality} />

          <div className="bg-white rounded-2xl p-5 stitch-border h-fit">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Checkpoints</p>
            <div className="space-y-2 mb-4">
              {drill.checkpoints.map((cp, i) => {
                const done = results[i];
                const active = phase === "running" && i === checkIndex;
                return (
                  <div key={cp.id} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${active ? "bg-turf-light" : ""}`}>
                    {done ? (
                      done.passed ? <Check size={15} className="text-turf shrink-0" /> : <X size={15} className="text-clay shrink-0" />
                    ) : (
                      <span className="w-[15px] h-[15px] rounded-full border-2 border-ink/20 shrink-0" />
                    )}
                    <span className={done && !done.passed ? "text-ink-soft" : ""}>{cp.label}</span>
                  </div>
                );
              })}
            </div>
            {phase === "setup" ? (
              <PrimaryButton className="w-full flex items-center justify-center gap-2" onClick={start}>
                <Play size={16} /> Start drill
              </PrimaryButton>
            ) : (
              <p className="text-xs text-ink-soft">{drill.scopeNote}</p>
            )}
          </div>
        </div>
      ) : (
        <SessionSummary
          drill={drill}
          summary={summary}
          previousSessions={previousSessions}
          onMarkIncorrect={() => markTutorialFeedbackIncorrect(summary.id)}
          onRetry={() => setPhase("setup")}
        />
      )}
    </div>
  );
}

function SessionSummary({ drill, summary, previousSessions, onMarkIncorrect, onRetry }) {
  const weak = summary.checkpointResults.filter((r) => !r.passed);
  const prevBest = previousSessions[0];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-white rounded-2xl p-6 stitch-border">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-display text-2xl tracking-wide">{summary.score}%</p>
            <p className="text-xs text-ink-soft">{summary.checkpointsPassed}/{summary.checkpointsTotal} checkpoints passed</p>
          </div>
          <Badge tone={summary.score >= 80 ? "turf" : summary.score >= 50 ? "gold" : "clay"}>
            {summary.score >= 80 ? "Strong session" : summary.score >= 50 ? "Solid attempt" : "Needs work"}
          </Badge>
        </div>

        {weak.length > 0 ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">What to work on</p>
            <div className="space-y-1.5 mb-5">
              {weak.map((w) => {
                const cp = drill.checkpoints.find((c) => c.id === w.id);
                return (
                  <p key={w.id} className="text-sm flex items-start gap-1.5 text-ink-soft">
                    <X size={13} className="text-clay mt-0.5 shrink-0" /> {cp?.description || w.label}
                  </p>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-turf-deep mb-5">All checkpoints passed — clean session!</p>
        )}

        {previousSessions.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-ink-soft mb-5 bg-paper-dim rounded-lg px-3 py-2 w-fit">
            <TrendingUp size={13} className="text-turf" />
            {summary.score > prevBest.score ? "Improved from" : summary.score === prevBest.score ? "Same as" : "Down from"} last session ({prevBest.score}%)
          </div>
        )}

        {summary.markedIncorrect ? (
          <Badge tone="clay">Marked as incorrect / incomplete</Badge>
        ) : (
          <button onClick={onMarkIncorrect} className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
            <ThumbsDown size={12} /> This feedback looks wrong / session was incomplete
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 stitch-border h-fit">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3 flex items-center gap-1.5">
          <ClipboardList size={13} /> Session history
        </p>
        {previousSessions.length === 0 ? (
          <p className="text-sm text-ink-soft mb-5">This is your first attempt at this drill.</p>
        ) : (
          <div className="space-y-2 mb-5">
            {previousSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-paper-dim">
                <span className="text-ink-soft">{s.date}</span>
                <span className="font-semibold">{s.score}%</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <GhostButton className="w-full" onClick={onRetry}>Retry this drill</GhostButton>
          <Link to="/app/coaching/tutorial" className="text-center text-sm font-semibold text-turf">
            Choose a different drill
          </Link>
        </div>
      </div>
    </div>
  );
}
