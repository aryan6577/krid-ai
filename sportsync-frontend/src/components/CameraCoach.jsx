import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, Play, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { createLivePoseTracker } from "../lib/livePoseTracker";

const CONNECTIONS = [[5, 7], [7, 9], [6, 8], [8, 10], [5, 6], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
const BATCH_FRAMES = 3;
const MAX_FRAMES = 300;
const MAX_SECONDS = 60;

export default function CameraCoach({ token, cameraView, exercise, targets, onPose, busy }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const startedRef = useRef(0);
  const framesRef = useRef([]);
  const samplesRef = useRef([]);
  const pendingRef = useRef(null);
  const capturedCountRef = useRef(0);
  const frameHeightRef = useRef(240);
  const recordingRef = useRef(false);
  const trackerRef = useRef(null);
  const canvasRef = useRef(null);
  const droppedRef = useRef(0);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState(null);
  const [frameHeight, setFrameHeight] = useState(240);
  const [quality, setQuality] = useState("Keep your full body in frame.");
  const [live, setLive] = useState(null);
  const [timings, setTimings] = useState(null);
  const [progress, setProgress] = useState({ analysed: 0, waiting: 0, skipped: 0 });

  const stopStream = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recordingRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => stopStream(), []);

  const openCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError("Camera access needs HTTPS or localhost in a supported browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("ready");
    } catch (err) {
      stopStream();
      setError(err.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access and try again." : "Camera could not start. Check whether another app is using it.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !recordingRef.current) return;
    const seconds = Math.floor((performance.now() - startedRef.current) / 1000);
    setElapsed(seconds);
    if (seconds >= MAX_SECONDS || capturedCountRef.current >= MAX_FRAMES) {
      finish();
      return;
    }
    // If inference is slower than capture, skip a frame rather than building
    // an unbounded queue of camera images in the browser.
    if (framesRef.current.length >= 6) { droppedRef.current += 1; setProgress((old) => ({ ...old, skipped: droppedRef.current })); return; }
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = 320;
    canvas.height = Math.round(video.videoHeight * (320 / video.videoWidth));
    if (frameHeightRef.current !== canvas.height) {
      frameHeightRef.current = canvas.height;
      setFrameHeight(canvas.height);
    }
    const captureStarted = performance.now();
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const captureMs = performance.now() - captureStarted;
    const encodedAt = performance.now();
    const imageBase64 = canvas.toDataURL("image/jpeg", 0.55);
    setTimings((old) => ({ ...old, captureMs: Math.round(captureMs), jpegEncodeMs: Math.round(performance.now() - encodedAt) }));
    framesRef.current.push({ timestampMs: Math.round(performance.now() - startedRef.current), imageBase64 });
    setProgress((old) => ({ ...old, waiting: framesRef.current.length }));
    capturedCountRef.current += 1;
    if (framesRef.current.length >= (samplesRef.current.length ? BATCH_FRAMES : 1)) drain().catch((err) => {
      setError(err.message || "Tracking failed. Please try again.");
      stopStream();
      setState("idle");
    });
  };

  const start = () => {
    framesRef.current = [];
    samplesRef.current = [];
    capturedCountRef.current = 0;
    droppedRef.current = 0;
    setProgress({ analysed: 0, waiting: 0, skipped: 0 });
    setTimings(null);
    trackerRef.current = exercise ? createLivePoseTracker(exercise) : null;
    setLive(trackerRef.current?.snapshot() || null);
    startedRef.current = performance.now();
    recordingRef.current = true;
    setElapsed(0);
    setPreview(null);
    setState("recording");
    capture();
    timerRef.current = setInterval(capture, 200);
  };

  const drain = async (flushRemainder = false) => {
    if (pendingRef.current) {
      await pendingRef.current;
      if (!flushRemainder) return;
    }
    if (framesRef.current.length < (samplesRef.current.length ? BATCH_FRAMES : 1) && !(flushRemainder && framesRef.current.length)) return;
    const task = (async () => {
      while (framesRef.current.length >= (samplesRef.current.length ? BATCH_FRAMES : 1) || (flushRemainder && framesRef.current.length)) {
        const requestStarted = performance.now();
        const batch = await api.analyzePoseFrames(token, framesRef.current.splice(0, samplesRef.current.length ? BATCH_FRAMES : 1));
        setTimings((old) => ({ ...old, ...batch.timingsMs, requestMs: Math.round(performance.now() - requestStarted) }));
        samplesRef.current.push(...batch.frames);
        setProgress({ analysed: samplesRef.current.length, waiting: framesRef.current.length, skipped: droppedRef.current });
        const latest = batch.frames.at(-1);
        setPreview(latest?.keypoints || null);
        setQuality(latest?.quality?.flag === "sufficient" ? `${samplesRef.current.length} frames tracked · body visible` : latest?.quality?.reasons?.includes("multiple_people") ? "More than one person is visible. Keep only yourself in frame." : "Pose unclear — improve light and keep your full body in frame.");
        if (trackerRef.current) {
          let liveSnapshot = trackerRef.current.snapshot();
          for (const frame of batch.frames) liveSnapshot = trackerRef.current.update(frame);
          setLive(liveSnapshot);
        }
        const responseHandledAt = performance.now();
        requestAnimationFrame(() => setTimings((old) => ({ ...old, uiFrameMs: Math.round(performance.now() - responseHandledAt) })));
      }
    })();
    pendingRef.current = task;
    try { await task; } finally { pendingRef.current = null; }
  };

  const finish = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    clearInterval(timerRef.current);
    timerRef.current = null;
    stopStream();
    if (capturedCountRef.current < 3) {
      setError("Record at least a few seconds so movement can be measured.");
      setState("idle");
      return;
    }
    setState("processing");
    setQuality("Finishing pose tracking…");
    try {
      await drain(true);
      const samples = samplesRef.current;
      const insufficient = samples.some((frame) => frame.quality.flag !== "sufficient");
      await onPose({
        schemaVersion: "krid.cv.pose.v1",
        status: insufficient ? "insufficient_quality" : "ok",
        requestReframing: insufficient,
        sampling: { requestedFps: 5, sourceFps: null, frameInterval: 1, maxSamples: MAX_FRAMES, processedSamples: samples.length },
        frames: samples,
      });
      setState("complete");
    } catch (err) {
      setError(err.message || "Tracking failed. Please try again.");
      setState("idle");
    } finally {
      framesRef.current = [];
      samplesRef.current = [];
    }
  };

  const points = preview?.map((point) => ({ x: point.x / 320 * 100, y: point.y / frameHeight * 100, confidence: point.confidence })) || [];

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] max-h-[540px] rounded-2xl overflow-hidden bg-turf-deep flex items-center justify-center text-white">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-fill ${state === "ready" || state === "recording" ? "" : "hidden"}`} />
        {state !== "ready" && state !== "recording" && <div className="relative text-center px-6"><Camera className="mx-auto mb-3" size={32} /><p>{state === "processing" ? "Analysing your session…" : "Your camera preview appears here"}</p></div>}
        {state === "recording" && <span className="absolute z-10 top-3 left-3 rounded-full bg-clay px-3 py-1 text-xs font-bold">● Live {elapsed}s / {MAX_SECONDS}s</span>}
        {state === "recording" && live && <div className="absolute z-10 top-3 right-3 rounded-xl bg-turf-deep/90 px-4 py-3 text-right shadow-lg" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/75">{exercise?.name === "Plank" ? "Hold" : "Reps"}</p>
          <p className="font-display text-4xl leading-none">{exercise?.name === "Plank" ? live.holdSeconds.toFixed(1) : live.reps}<span className="text-base text-white/75"> / {exercise?.name === "Plank" ? Number(targets?.holdSeconds || 30) + "s" : Number(targets?.reps || 8) * Number(targets?.sets || 1)}</span></p>
          {exercise?.name !== "Plank" && <p className="text-xs text-white/80 mt-1">Set {Math.min(Math.floor(live.reps / Math.max(1, Number(targets?.reps || 8))) + 1, Number(targets?.sets || 1))} of {Number(targets?.sets || 1)}</p>}
          {live.value !== null && <p className="text-xs text-white/80 mt-1">{exercise?.name === "Jumping jack" ? "Separation" : exercise?.name === "Plank" ? "Alignment" : "Joint angle"}: {live.value}{live.unit}</p>}
        </div>}
        {state === "recording" && live && <div className="absolute z-10 bottom-3 left-3 right-3 rounded-lg bg-turf-deep/85 px-3 py-2 text-sm font-semibold">{quality.includes("body visible") ? live.cue : quality}</div>}
        {state === "recording" && points.length > 0 && <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Detected body pose">
          {CONNECTIONS.map(([a, b]) => points[a]?.confidence > .3 && points[b]?.confidence > .3 && <line key={`${a}-${b}`} x1={points[a].x} y1={points[a].y} x2={points[b].x} y2={points[b].y} stroke="#E8B93F" strokeWidth=".6" />)}
          {points.map((point, index) => point.confidence > .3 && <circle key={index} cx={point.x} cy={point.y} r=".8" fill="#E8B93F" />)}
        </svg>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{cameraView || "Front"} view · one person · full body · bright light. Frames are sent for analysis and are not saved as video.</p>
        <div className="flex gap-2">
          {state === "idle" || state === "complete" ? <button onClick={openCamera} disabled={busy} className="coach-button"><Camera size={17} /> {state === "complete" ? "Try again" : "Enable camera"}</button> : null}
          {state === "ready" && <button onClick={start} className="coach-button"><Play size={17} /> Start session</button>}
          {state === "recording" && <button onClick={finish} className="coach-button"><CircleStop size={17} /> Finish session</button>}
          {state === "ready" && <button onClick={() => { stopStream(); setState("idle"); }} className="coach-secondary"><RotateCcw size={17} /> Cancel</button>}
        </div>
      </div>
      {(state === "recording" || state === "processing" || state === "complete") && <p role="status" className="text-sm font-semibold text-turf-deep">{quality}</p>}
      {(state === "recording" || state === "processing") && <p className="text-xs text-ink-soft" aria-live="polite">{progress.analysed} frames analysed · {progress.waiting} waiting · {progress.skipped} skipped while the model catches up</p>}
      {timings && <details className="text-xs text-ink-soft"><summary className="cursor-pointer">Tracking speed details</summary><p>Capture {timings.captureMs ?? "—"} ms · JPEG {timings.jpegEncodeMs ?? "—"} ms · Request including transfer {timings.requestMs ?? "—"} ms · CV round trip {timings.cvRoundTrip ?? "—"} ms · JPEG decode {timings.jpegDecode ?? "—"} ms · Pose and quality {timings.poseInferenceAndQuality ?? "—"} ms · UI frame {timings.uiFrameMs ?? "—"} ms</p></details>}
      {error && <p role="alert" className="rounded-xl bg-clay-light p-3 text-sm text-clay-deep">{error}</p>}
      <p className="text-xs text-ink-soft">Movement feedback is informational and depends on camera quality. It is not medical advice.</p>
    </div>
  );
}
