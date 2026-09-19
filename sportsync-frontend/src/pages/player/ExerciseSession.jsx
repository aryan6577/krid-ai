import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Flame, Sparkles, ThumbsDown, CheckCheck, Play, Square } from "lucide-react";
import { SectionHeading, Badge, PrimaryButton, GhostButton, ProgressBar } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { getExerciseById } from "../../data/exercises";
import CameraPanel from "../../components/CameraPanel";

export default function ExerciseSession() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const { completeExerciseSession, markExerciseFeedbackIncorrect, streak } = useApp();
  const exercise = getExerciseById(exerciseId);

  const [phase, setPhase] = useState("setup"); // setup | running | summary
  const [quality, setQuality] = useState("blocked");
  const [set, setSet] = useState(1);
  const [reps, setReps] = useState(0);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [qualityTicks, setQualityTicks] = useState({ good: 0, limited: 0 });
  const [summary, setSummary] = useState(null);
  const tickRef = useRef();

  const isHold = !!exercise?.holdDurationSec;

  useEffect(() => () => {
    clearInterval(tickRef.current?.qualityInterval);
    clearInterval(tickRef.current?.stepInterval);
  }, []);

  if (!exercise) {
    return (
      <div>
        <p className="mb-4">Exercise not found.</p>
        <GhostButton onClick={() => navigate("/app/coaching/exercise")}>Back to Exercise Mode</GhostButton>
      </div>
    );
  }

  const finish = (completion) => {
    clearInterval(tickRef.current?.qualityInterval);
    clearInterval(tickRef.current?.stepInterval);
    const totalTicks = qualityTicks.good + qualityTicks.limited || 1;
    const qualityRatio = qualityTicks.good / totalTicks;
    const detectionQuality = qualityRatio > 0.75 ? "Good" : qualityRatio > 0.4 ? "Limited" : "Invalid";
    const techniqueScore = completion === "complete" ? Math.round(70 + qualityRatio * 25) : Math.round(40 + qualityRatio * 20);
    const good = techniqueScore >= 80;
    const cues = (good ? exercise.goodFeedback : exercise.improvementFeedback).slice(0, 2);

    const record = completeExerciseSession({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: exercise.targetSets,
      reps: isHold ? null : exercise.targetReps,
      holdDurationSec: isHold ? exercise.holdDurationSec : null,
      completion,
      detectionQuality,
      techniqueScore,
      feedback: cues,
    });
    setSummary(record);
    setPhase("summary");
  };

  const start = () => {
    setPhase("running");
    setSet(1);
    setReps(0);
    setHoldSeconds(0);
    setQualityTicks({ good: 0, limited: 0 });

    const qualityInterval = setInterval(() => {
      setQuality((q) => {
        setQualityTicks((prev) => (q === "good" ? { ...prev, good: prev.good + 1 } : q === "limited" ? { ...prev, limited: prev.limited + 1 } : prev));
        return q;
      });
    }, 1000);

    const stepInterval = setInterval(() => {
      setQuality((currentQuality) => {
        if (currentQuality !== "good") return currentQuality; // pause progress while reframing
        if (isHold) {
          setHoldSeconds((h) => {
            const next = h + 1;
            if (next >= exercise.holdDurationSec) finish("complete");
            return next;
          });
        } else {
          setReps((r) => {
            const next = r + 1;
            if (next >= exercise.targetReps) {
              setSet((s) => {
                const nextSet = s + 1;
                if (nextSet > exercise.targetSets) finish("complete");
                return nextSet;
              });
              return 0;
            }
            return next;
          });
        }
        return currentQuality;
      });
    }, 1500);

    tickRef.current = { qualityInterval, stepInterval };
  };

  const stopEarly = () => finish("incomplete");

  return (
    <div>
      <Link to="/app/coaching/exercise" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to Exercise Mode
      </Link>

      <SectionHeading eyebrow={`Exercise Mode · ${exercise.cameraView} view`} title={exercise.name} />

      {phase !== "summary" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <CameraPanel
            running={phase === "running"}
            onQualityChange={setQuality}
            overlay={
              phase === "running" && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    {isHold ? `Hold: ${holdSeconds}s / ${exercise.holdDurationSec}s` : `Set ${set}/${exercise.targetSets} · Rep ${reps}/${exercise.targetReps}`}
                  </span>
                </div>
              )
            }
          />

          <div className="bg-white rounded-2xl p-5 stitch-border h-fit">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-3">Session</p>
            {phase === "setup" ? (
              <>
                <p className="text-sm text-ink-soft mb-4">
                  {isHold ? `Hold for ${exercise.holdDurationSec}s.` : `${exercise.targetSets} sets × ${exercise.targetReps} reps.`} Grant camera access, then start when framed correctly.
                </p>
                <PrimaryButton className="w-full flex items-center justify-center gap-2" onClick={start}>
                  <Play size={16} /> Start session
                </PrimaryButton>
              </>
            ) : (
              <>
                <p className="text-sm text-ink-soft mb-3">Primary metrics tracked:</p>
                <ul className="text-xs text-ink-soft space-y-1 mb-4 list-disc list-inside">
                  {exercise.primaryMetrics.map((m) => <li key={m}>{m}</li>)}
                </ul>
                <GhostButton className="w-full flex items-center justify-center gap-2" onClick={stopEarly}>
                  <Square size={14} /> End session
                </GhostButton>
                {quality === "blocked" && (
                  <button
                    onClick={() => finish("complete")}
                    className="text-xs text-ink-soft underline underline-offset-2 mt-3 block mx-auto"
                  >
                    No camera available — log this session manually instead
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <SessionSummary
          summary={summary}
          streak={streak}
          onMarkIncorrect={() => markExerciseFeedbackIncorrect(summary.id)}
          onRetry={() => setPhase("setup")}
        />
      )}
    </div>
  );
}

function SessionSummary({ summary, streak, onMarkIncorrect, onRetry }) {
  const complete = summary.completion === "complete";
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="bg-white rounded-2xl p-6 stitch-border">
        <div className="flex items-center gap-3 mb-5">
          <span className={`w-12 h-12 rounded-full flex items-center justify-center ${complete ? "bg-turf-light text-turf-deep" : "bg-clay-light text-clay-deep"}`}>
            <CheckCheck size={22} />
          </span>
          <div>
            <p className="font-display text-xl tracking-wide">{complete ? "Session complete" : "Session ended early"}</p>
            <p className="text-xs text-ink-soft">Detection quality: {summary.detectionQuality}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <StatBox label="Technique score" value={`${summary.techniqueScore}%`} />
          <StatBox label="Sets" value={summary.sets} />
          <StatBox label={summary.holdDurationSec ? "Hold target" : "Reps/set"} value={summary.holdDurationSec ? `${summary.holdDurationSec}s` : summary.reps} />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Feedback</p>
        <div className="space-y-1.5 mb-5">
          {summary.feedback.map((f, i) => (
            <p key={i} className="text-sm flex items-start gap-1.5 text-ink-soft">
              <Sparkles size={13} className="text-clay mt-0.5 shrink-0" /> {f}
            </p>
          ))}
        </div>

        {summary.markedIncorrect ? (
          <Badge tone="clay">Marked as incorrect / incomplete</Badge>
        ) : (
          <button onClick={onMarkIncorrect} className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
            <ThumbsDown size={12} /> This feedback looks wrong / session was incomplete
          </button>
        )}

        <p className="text-xs text-ink-soft/70 mt-5">
          This feedback is informational movement guidance only — not a medical diagnosis (BR-25).
        </p>
      </div>

      <div className="bg-turf-deep text-white rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/60 mb-2">Streak</p>
          <div className="flex items-center gap-2 mb-1">
            <Flame size={22} className="text-gold" />
            <span className="scoreboard text-3xl font-bold">{streak.current}d</span>
          </div>
          <p className="text-xs text-white/60">Longest: {streak.longest}d</p>
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <GhostButton className="!border-white/30 !text-white w-full" onClick={onRetry}>Do another set</GhostButton>
          <Link to="/app/coaching/exercise" className="text-center text-sm font-semibold text-white/80 hover:text-white">
            Choose a different exercise
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-paper-dim rounded-xl p-3 text-center">
      <p className="scoreboard text-xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-ink-soft mt-0.5">{label}</p>
    </div>
  );
}
