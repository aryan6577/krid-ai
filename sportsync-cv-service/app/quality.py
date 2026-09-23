from dataclasses import dataclass

import numpy as np

from .contracts import FrameQuality, QualityReasonCode


@dataclass(frozen=True)
class QualityThresholds:
    min_person_confidence: float
    min_keypoint_confidence: float
    min_visible_keypoints: int
    min_avg_keypoint_confidence: float


def insufficient_quality(
    reasons: list[QualityReasonCode],
    *,
    person_confidence: float | None = None,
    average_keypoint_confidence: float | None = None,
    visible_keypoint_count: int = 0,
) -> FrameQuality:
    return FrameQuality(
        flag="insufficient",
        requestReframing=True,
        reasons=reasons,
        message="insufficient quality — request reframing",
        personConfidence=person_confidence,
        averageKeypointConfidence=average_keypoint_confidence,
        visibleKeypointCount=visible_keypoint_count,
    )


def evaluate_pose_quality(
    *,
    person_confidence: float | None,
    keypoint_confidences: np.ndarray | None,
    thresholds: QualityThresholds,
) -> FrameQuality:
    if keypoint_confidences is None or keypoint_confidences.shape[0] != 17:
        return insufficient_quality(["no_visible_person"], person_confidence=person_confidence)

    safe_confidences = np.nan_to_num(keypoint_confidences.astype(float), nan=0.0, posinf=0.0, neginf=0.0)
    visible_count = int(np.count_nonzero(safe_confidences >= thresholds.min_keypoint_confidence))
    avg_confidence = float(np.mean(safe_confidences))

    reasons: list[QualityReasonCode] = []
    if person_confidence is None or person_confidence < thresholds.min_person_confidence or visible_count == 0:
        reasons.append("no_visible_person")
    if visible_count < thresholds.min_visible_keypoints:
        reasons.append("severe_occlusion")
    if avg_confidence < thresholds.min_avg_keypoint_confidence:
        reasons.append("insufficient_average_keypoint_confidence")

    if reasons:
        return insufficient_quality(
            reasons,
            person_confidence=person_confidence,
            average_keypoint_confidence=avg_confidence,
            visible_keypoint_count=visible_count,
        )

    return FrameQuality(
        flag="sufficient",
        requestReframing=False,
        reasons=[],
        message="sufficient quality",
        personConfidence=person_confidence,
        averageKeypointConfidence=avg_confidence,
        visibleKeypointCount=visible_count,
    )
