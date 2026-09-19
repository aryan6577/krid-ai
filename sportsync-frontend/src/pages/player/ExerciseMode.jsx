import { Link } from "react-router-dom";
import { ArrowLeft, Dumbbell, Video, Repeat, Timer } from "lucide-react";
import { SectionHeading, Badge } from "../../components/ui";
import { exerciseCatalog } from "../../data/exercises";

export default function ExerciseMode() {
  return (
    <div>
      <Link to="/app/coaching" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to coaching
      </Link>

      <SectionHeading eyebrow="Exercise Mode · FR-71 / FR-72" title="Choose an exercise" />
      <p className="text-sm text-ink-soft max-w-2xl mb-6">
        Camera-assisted training session with rep/set counting and form feedback. Informational only — not a
        medical assessment (BR-25).
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {exerciseCatalog.map((ex) => (
          <Link
            key={ex.id}
            to={`/app/coaching/exercise/${ex.id}`}
            className="bg-white rounded-2xl p-5 stitch-border hover:border-turf transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="w-10 h-10 rounded-full bg-turf-light text-turf-deep flex items-center justify-center">
                  <Dumbbell size={18} />
                </span>
                <Badge tone="neutral">{ex.difficulty}</Badge>
              </div>
              <p className="font-display text-lg tracking-wide mb-1">{ex.name}</p>
              <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-1">
                <Video size={12} /> Camera view: {ex.cameraView}
              </p>
              <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-3">
                {ex.holdDurationSec ? (
                  <><Timer size={12} /> Hold {ex.holdDurationSec}s</>
                ) : (
                  <><Repeat size={12} /> {ex.targetSets} sets × {ex.targetReps} reps</>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ex.goalTags.map((t) => (
                  <Badge key={t} tone="turf">{t}</Badge>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
