import { Link } from "react-router-dom";
import { ArrowLeft, Target, Video, ListChecks } from "lucide-react";
import { SectionHeading, Badge } from "../../components/ui";
import { tutorialCatalog } from "../../data/tutorials";

export default function TutorialMode() {
  return (
    <div>
      <Link to="/app/coaching" className="inline-flex items-center gap-1.5 text-sm font-semibold text-turf mb-5">
        <ArrowLeft size={15} /> Back to coaching
      </Link>

      <SectionHeading eyebrow="Tutorial Mode · FR-79 / FR-80" title="Choose a sport & drill" />
      <p className="text-sm text-ink-soft max-w-2xl mb-6">
        Structured practice with camera-friendly checkpoints — not a full match-analysis or biomechanics assessment.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {tutorialCatalog.map((t) => (
          <Link
            key={t.id}
            to={`/app/coaching/tutorial/${t.id}`}
            className="bg-white rounded-2xl p-5 stitch-border hover:border-turf transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-10 h-10 rounded-full bg-clay-light text-clay-deep flex items-center justify-center">
                <Target size={18} />
              </span>
              <Badge tone="navy">{t.sport}</Badge>
            </div>
            <p className="font-display text-lg tracking-wide mb-1">{t.drillName}</p>
            <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-1">
              <Video size={12} /> Camera view: {t.cameraView}
            </p>
            <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-3">
              <ListChecks size={12} /> {t.checkpoints.length} checkpoints
            </p>
            <p className="text-xs text-ink-soft/70 italic">{t.scopeNote}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
