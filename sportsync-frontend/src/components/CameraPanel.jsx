import { useEffect, useRef, useState } from "react";
import { Camera, TriangleAlert, RotateCcw, Video } from "lucide-react";
import { GhostButton } from "./ui";

// Shared camera-capture shell for Exercise Mode / Tutorial Mode (FR-73, FR-90, BR-18, BR-19).
// Requests real camera permission and shows a live preview (genuine getUserMedia call) — the
// pose-estimation/rule-engine layer itself (SRS §6.2/6.3, YOLOv8-Pose + OpenCV) is a separate
// backend/CV service out of scope here, so quality state and detection are simulated on a timer
// to drive the same UI contract (`onQualityChange`) a real CV service would drive.
export default function CameraPanel({ running, onQualityChange, overlay }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [permission, setPermission] = useState("idle"); // idle | requesting | granted | denied
  const [quality, setQuality] = useState("checking"); // checking | good | limited | blocked

  const requestCamera = async () => {
    setPermission("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPermission("granted");
    } catch {
      setPermission("denied");
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Simulated quality gate (FR-90): mostly "good", occasionally asks for reframing
  useEffect(() => {
    if (permission !== "granted" || !running) return;
    setQuality("checking");
    const initial = setTimeout(() => setQuality("good"), 900);
    const interval = setInterval(() => {
      setQuality((prev) => {
        const roll = Math.random();
        const next = roll < 0.08 ? "limited" : "good";
        return next;
      });
    }, 4000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [permission, running]);

  useEffect(() => {
    onQualityChange?.(permission === "granted" ? quality : "blocked");
  }, [quality, permission, onQualityChange]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-turf-deep aspect-video flex items-center justify-center">
      {permission === "granted" ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
      ) : (
        <div className="text-center text-white/80 px-6">
          <Camera size={32} className="mx-auto mb-3 opacity-70" />
          {permission === "denied" ? (
            <>
              <p className="text-sm font-semibold mb-1">Camera permission denied</p>
              <p className="text-xs text-white/60 mb-4">You can still log this session manually below.</p>
              <GhostButton className="!border-white/30 !text-white !px-4 !py-2 text-sm flex items-center gap-1.5 mx-auto" onClick={requestCamera}>
                <RotateCcw size={14} /> Try again
              </GhostButton>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold mb-1">Camera permission required</p>
              <p className="text-xs text-white/60 mb-4">Used only for this session — not recorded or stored (BR-18).</p>
              <GhostButton
                className="!border-white/30 !text-white !px-4 !py-2 text-sm flex items-center gap-1.5 mx-auto"
                onClick={requestCamera}
                disabled={permission === "requesting"}
              >
                <Video size={14} /> {permission === "requesting" ? "Requesting…" : "Enable camera"}
              </GhostButton>
            </>
          )}
        </div>
      )}

      {permission === "granted" && running && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
              quality === "good" ? "bg-turf/80 text-white" : quality === "checking" ? "bg-white/20 text-white" : "bg-clay/85 text-white"
            }`}
          >
            {quality === "good" && "Detection quality: Good"}
            {quality === "checking" && "Checking framing…"}
            {quality === "limited" && <><TriangleAlert size={11} /> Reposition — full body not clearly visible</>}
          </span>
        </div>
      )}

      {permission === "granted" && overlay}
    </div>
  );
}
