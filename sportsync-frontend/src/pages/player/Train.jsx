import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, Loader2 } from "lucide-react";
import { Badge, GhostButton, ProgressBar, SectionHeading } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { api } from "../../lib/api";
import CameraCoach from "../../components/CameraCoach";

export default function Train() {
  const { session, pushNotification } = useApp();
  const [catalog, setCatalog] = useState([]);
  const [tutorialCatalog, setTutorialCatalog] = useState([]);
  const [recent, setRecent] = useState([]);
  const [recentTutorials, setRecentTutorials] = useState([]);
  const [mode, setMode] = useState("exercise");
  const [exerciseName, setExerciseName] = useState("Bodyweight squat");
  const [tutorialKey, setTutorialKey] = useState("Cricket::Batting stance + shadow front-foot movement");
  const [targets, setTargets] = useState({ reps: 8, sets: 1, holdSeconds: 30 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedExercise = useMemo(
    () => catalog.find((exercise) => exercise.name === exerciseName) || catalog[0],
    [catalog, exerciseName]
  );
  const selectedTutorial = useMemo(() => {
    const [sport, drillName] = tutorialKey.split("::");
    return tutorialCatalog.find((drill) => drill.sport === sport && drill.drillName === drillName) || tutorialCatalog[0];
  }, [tutorialCatalog, tutorialKey]);
  const isHoldExercise = selectedExercise?.name === "Plank";

  const loadData = async () => {
    if (!session.accessToken) return;
    try {
      const [catalogResult, recentResult, tutorialCatalogResult, tutorialRecentResult] = await Promise.allSettled([
        api.getExerciseCatalog(session.accessToken),
        api.getExerciseEvaluations(session.accessToken, 6),
        api.getTutorialCatalog(session.accessToken),
        api.getTutorialEvaluations(session.accessToken, 6),
      ]);
      const catalogData = catalogResult.status === "fulfilled" ? catalogResult.value : { exercises: [] };
      const recentData = recentResult.status === "fulfilled" ? recentResult.value : { sessions: [] };
      const tutorialCatalogData = tutorialCatalogResult.status === "fulfilled" ? tutorialCatalogResult.value : { drills: [] };
      const tutorialRecentData = tutorialRecentResult.status === "fulfilled" ? tutorialRecentResult.value : { sessions: [] };
      setCatalog(catalogData.exercises || []);
      setRecent(recentData.sessions || []);
      setTutorialCatalog(tutorialCatalogData.drills || []);
      setRecentTutorials(tutorialRecentData.sessions || []);
      if (catalogResult.status === "rejected" || tutorialCatalogResult.status === "rejected") setError("Training catalog is unavailable. Try refreshing when the API is running.");
      if (catalogData.exercises?.[0] && !exerciseName) setExerciseName(catalogData.exercises[0].name);
      if (tutorialCatalogData.drills?.[0] && !tutorialKey) {
        setTutorialKey(`${tutorialCatalogData.drills[0].sport}::${tutorialCatalogData.drills[0].drillName}`);
      }
    } catch (err) {
      setError(err.message || "Could not load training data.");
    }
  };

  useEffect(() => {
    loadData();
  }, [session.accessToken]);

  const evaluate = async (pose) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data =
        mode === "tutorial"
          ? await api.evaluateTutorialSession(session.accessToken, {
              sport: selectedTutorial.sport,
              drillName: selectedTutorial.drillName,
              pose,
            })
          : await api.evaluateExerciseSession(session.accessToken, {
              exerciseName,
              pose,
              targets: isHoldExercise
                ? { holdSeconds: Number(targets.holdSeconds || 30) }
                : { reps: Number(targets.reps || 8), sets: Number(targets.sets || 1) },
            });
      setResult(data);
      if (mode === "tutorial") {
        setRecentTutorials((items) => [data.session, ...items.filter((item) => item.id !== data.session.id)].slice(0, 6));
      } else {
        setRecent((items) => [data.session, ...items.filter((item) => item.id !== data.session.id)].slice(0, 6));
      }
      pushNotification({
        type: mode,
        text: `${mode === "tutorial" ? data.session.tutorial.drillName : data.session.exercise.name} evaluated: ${data.evaluation.completion.percentage}% of target.`,
      });
    } catch (err) {
      setError(err.message || "Could not evaluate this CV output.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const flagFeedback = async (sessionId, ruleId) => {
    setMessage("");
    try {
      const data =
        mode === "tutorial"
          ? await api.updateTutorialSessionCorrections(session.accessToken, sessionId, {
              checkpointId: ruleId,
              feedbackIncorrect: true,
            })
          : await api.updateExerciseSessionCorrections(session.accessToken, sessionId, {
              feedbackItemId: ruleId,
              feedbackIncorrect: true,
            });
      setResult((current) => (current?.session?.id === sessionId ? { ...current, session: data.session } : current));
      if (mode === "tutorial") {
        setRecentTutorials((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      } else {
        setRecent((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      }
      setMessage("Feedback flag saved without changing the original detected result.");
    } catch (err) {
      setMessage(err.message || "Could not save correction.");
    }
  };

  const markIncomplete = async (sessionId) => {
    setMessage("");
    try {
      const payload = { sessionIncomplete: true, note: "User marked the session incomplete." };
      const data =
        mode === "tutorial"
          ? await api.updateTutorialSessionCorrections(session.accessToken, sessionId, payload)
          : await api.updateExerciseSessionCorrections(session.accessToken, sessionId, payload);
      setResult((current) => (current?.session?.id === sessionId ? { ...current, session: data.session } : current));
      if (mode === "tutorial") {
        setRecentTutorials((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      } else {
        setRecent((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      }
      setMessage("Session correction saved. Original detected completion is still preserved.");
    } catch (err) {
      setMessage(err.message || "Could not save correction.");
    }
  };

  const confirmCompleteManually = async (sessionId) => {
    setMessage("");
    try {
      const payload = {
        manualCompletionConfirmed: true,
        note: "User manually confirmed completion after limited detection quality.",
      };
      const data =
        mode === "tutorial"
          ? await api.updateTutorialSessionCorrections(session.accessToken, sessionId, payload)
          : await api.updateExerciseSessionCorrections(session.accessToken, sessionId, payload);
      setResult((current) => (current?.session?.id === sessionId ? { ...current, session: data.session } : current));
      if (mode === "tutorial") {
        setRecentTutorials((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      } else {
        setRecent((items) => items.map((item) => (item.id === sessionId ? data.session : item)));
      }
      setMessage("Manual completion saved and sent through the Activity Event service.");
    } catch (err) {
      setMessage(err.message || "Could not confirm completion.");
    }
  };

  return (
    <div>
      <SectionHeading eyebrow="Train" title={mode === "tutorial" ? "Practise a sport drill" : "Train with your camera"} />

      <div className="inline-flex bg-paper-dim rounded-full p-1 mb-5">
        {[
          ["exercise", "Exercise Mode"],
          ["tutorial", "Tutorial Mode"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setMode(value);
              setResult(null);
              setMessage("");
              setError("");
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              mode === value ? "bg-turf text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-6">
        <div className="bg-white rounded-2xl p-6 stitch-border">
          {mode === "exercise" ? (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <Field label="Exercise">
                  <select className="input" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)}>
                    {catalog.map((exercise) => (
                      <option key={exercise.name}>{exercise.name}</option>
                    ))}
                  </select>
                </Field>
                {isHoldExercise ? (
                  <Field label="Hold target">
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={targets.holdSeconds}
                      onChange={(event) => setTargets({ ...targets, holdSeconds: event.target.value })}
                    />
                  </Field>
                ) : (
                  <>
                    <Field label="Reps">
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={targets.reps}
                        onChange={(event) => setTargets({ ...targets, reps: event.target.value })}
                      />
                    </Field>
                    <Field label="Sets">
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={targets.sets}
                        onChange={(event) => setTargets({ ...targets, sets: event.target.value })}
                      />
                    </Field>
                  </>
                )}
              </div>

              {selectedExercise && (
                <div className="bg-paper-dim rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-display text-xl tracking-wide">{selectedExercise.name}</p>
                      <p className="text-sm text-ink-soft">{selectedExercise.cameraView} camera view</p>
                    </div>
                    <Badge tone="navy">Deterministic rules</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedExercise.primaryMetrics?.map((metric) => (
                      <Badge key={metric} tone="neutral">{metric}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4 mb-5">
                <Field label="Pilot drill">
                  <select className="input" value={tutorialKey} onChange={(event) => setTutorialKey(event.target.value)}>
                    {tutorialCatalog.map((drill) => (
                      <option key={`${drill.sport}::${drill.drillName}`} value={`${drill.sport}::${drill.drillName}`}>
                        {drill.sport} · {drill.drillName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Camera view">
                  <input
                    className="input"
                    readOnly
                    value={selectedTutorial?.cameraView || ""}
                  />
                </Field>
              </div>
              {selectedTutorial && (
                <div className="bg-paper-dim rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-display text-xl tracking-wide">{selectedTutorial.sport}</p>
                      <p className="text-sm text-ink-soft">{selectedTutorial.scopeNote}</p>
                    </div>
                    <Badge tone="navy">Checkpoint config</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTutorial.checkpoints?.map((checkpoint) => (
                      <Badge key={checkpoint.id} tone="neutral">{checkpoint.type}: {checkpoint.label}</Badge>
                    ))}
                  </div>
                  {selectedTutorial.educationalContent?.sources?.length > 0 && (
                    <div className="mt-4 border-t border-ink/10 pt-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2">Educational sources</p>
                      <div className="space-y-1">
                        {selectedTutorial.educationalContent.sources.map((source) => (
                          <a
                            key={`${source.provider}-${source.url}`}
                            className="block text-sm font-semibold text-turf"
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <CameraCoach key={`${mode}:${mode === "exercise" ? exerciseName : tutorialKey}`} token={session.accessToken} cameraView={mode === "exercise" ? selectedExercise?.cameraView : selectedTutorial?.cameraView} exercise={mode === "exercise" ? selectedExercise : null} targets={targets} onPose={evaluate} busy={loading || !(mode === "exercise" ? selectedExercise : selectedTutorial)} />
          {loading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-turf"><Loader2 size={16} className="animate-spin" /> Saving session feedback…</p>}
          {error && <p className="text-sm text-clay-deep bg-clay-light rounded-xl px-3 py-2 mt-4">{error}</p>}
          {message && <p className="text-sm text-turf-deep bg-turf-light rounded-xl px-3 py-2 mt-4">{message}</p>}
        </div>

        <div className="space-y-5">
          <RecentEvaluations mode={mode} sessions={mode === "tutorial" ? recentTutorials : recent} />
          {result && (
            <EvaluationResult
              mode={mode}
              result={result}
              onFlagFeedback={flagFeedback}
              onMarkIncomplete={markIncomplete}
              onManualConfirm={confirmCompleteManually}
            />
          )}
        </div>
      </div>

      <InputStyle />
    </div>
  );
}

export function RecentEvaluations({ mode = "exercise", sessions = [] }) {
  const title = mode === "tutorial" ? "Tutorial checkpoints" : "Exercise feedback";
  return (
    <div className="bg-white rounded-2xl p-5 stitch-border">
      <SectionHeading eyebrow="Recent Evaluations" title={title} />
      {!sessions.length ? (
        <p className="text-sm text-ink-soft">No {mode === "tutorial" ? "tutorial" : "exercise"} evaluations yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <EvaluationSummary key={session.id} mode={mode} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}

function EvaluationSummary({ mode, session }) {
  const detected = session.detectedResult || {};
  const completion = detected.completion || {};
  const quality = detected.detectionQuality?.state || "Invalid";
  const label =
    mode === "tutorial"
      ? session.tutorial?.drillName || detected.tutorial?.drillName || "Tutorial drill"
      : session.exercise?.name || detected.exercise?.name || "Exercise";
  const timestamp = session.startAt ? new Date(session.startAt).toLocaleString() : "Session time unavailable";
  return (
    <div className="rounded-xl bg-paper-dim p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-ink-soft">{timestamp}</p>
        </div>
        <Badge tone={completion.completed ? "turf" : quality === "Good" ? "gold" : "clay"}>
          {completion.completed ? "Complete" : quality}
        </Badge>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-ink-soft mb-1">
          <span>{mode === "tutorial" ? "Checkpoint coverage" : "Target"}</span>
          <span>{completion.percentage || 0}%</span>
        </div>
        <ProgressBar value={completion.percentage || 0} tone={completion.completed ? "turf" : "gold"} />
      </div>
      {session.correctionFlags?.sessionMarkedIncomplete && (
        <p className="text-xs text-clay-deep mt-2">User marked this session incomplete.</p>
      )}
      {session.correctionFlags?.manualCompletionConfirmed && (
        <p className="text-xs text-turf-deep mt-2">User manually confirmed completion.</p>
      )}
    </div>
  );
}

function EvaluationResult({ mode, result, onFlagFeedback, onMarkIncomplete, onManualConfirm }) {
  const { session, evaluation } = result;
  const canManuallyConfirm = evaluation.completion.manualConfirmationRequired && evaluation.completion.targetMet;
  const scoreLabel = mode === "tutorial" ? "Score" : "Technique";
  const scoreValue = mode === "tutorial" ? evaluation.score : evaluation.techniqueQualityScore;
  return (
    <div className="bg-white rounded-2xl p-5 stitch-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-display text-xl tracking-wide">Latest result</p>
          <p className="text-xs text-ink-soft">{evaluation.coachingDisclaimer}</p>
        </div>
        {evaluation.completion.completed ? <CheckCircle2 className="text-turf" /> : <AlertTriangle className="text-clay" />}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Metric label="Completion" value={`${evaluation.completion.percentage}%`} />
        <Metric label={scoreLabel} value={`${scoreValue}/100`} />
        <Metric label="Consistency" value={`${evaluation.consistency.score}/100`} />
        <Metric label="Detection" value={evaluation.detectionQuality.state} />
      </div>
      {mode === "tutorial" && evaluation.trend?.message && (
        <p className="text-sm bg-paper-dim rounded-xl px-3 py-2 mb-4">{evaluation.trend.message}</p>
      )}
      <div className="space-y-2 mb-4">
        {evaluation.improvementCues.map((cue) => (
          <p key={cue} className="text-sm bg-paper-dim rounded-xl px-3 py-2">{cue}</p>
        ))}
      </div>
      <div className="space-y-2">
        {evaluation.rules.filter((rule) => rule.producedFeedback).slice(0, 4).map((rule) => (
          <div key={rule.ruleId} className="rounded-xl border border-ink/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{rule.feedback}</p>
                <p className="text-xs text-ink-soft">Rule {rule.ruleId}: value {rule.value}, threshold {rule.threshold}</p>
              </div>
              <GhostButton className="!px-3 !py-1.5 text-xs flex items-center gap-1" onClick={() => onFlagFeedback(session.id, rule.ruleId)}>
                <Flag size={13} /> Incorrect
              </GhostButton>
            </div>
          </div>
        ))}
      </div>
      {canManuallyConfirm && !session.correctionFlags?.manualCompletionConfirmed && (
        <GhostButton className="w-full mt-4" onClick={() => onManualConfirm(session.id)}>
          Confirm completed manually
        </GhostButton>
      )}
      {session.correctionFlags?.manualCompletionConfirmed && (
        <p className="text-sm text-turf-deep bg-turf-light rounded-xl px-3 py-2 mt-4">
          User manually confirmed completion.
        </p>
      )}
      <GhostButton className="w-full mt-4" onClick={() => onMarkIncomplete(session.id)}>
        Mark whole session incomplete
      </GhostButton>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-paper-dim p-3">
      <p className="text-[11px] uppercase tracking-widest text-ink-soft font-bold">{label}</p>
      <p className="scoreboard text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-ink-soft mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function InputStyle() {
  return (
    <style>{`.input { width:100%; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid rgba(18,32,27,0.15); background: white; font-size: 0.875rem; }`}</style>
  );
}
