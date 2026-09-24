import numpy as np

from app.quality import QualityThresholds, evaluate_pose_quality


THRESHOLDS = QualityThresholds(
    min_person_confidence=0.35,
    min_keypoint_confidence=0.30,
    min_visible_keypoints=12,
    min_avg_keypoint_confidence=0.45,
)


def test_sufficient_pose_quality():
    quality = evaluate_pose_quality(
        person_confidence=0.9,
        keypoint_confidences=np.full(17, 0.8),
        thresholds=THRESHOLDS,
    )

    assert quality.flag == "sufficient"
    assert quality.requestReframing is False
    assert quality.visibleKeypointCount == 17


def test_low_average_confidence_requests_reframing():
    quality = evaluate_pose_quality(
        person_confidence=0.9,
        keypoint_confidences=np.full(17, 0.2),
        thresholds=THRESHOLDS,
    )

    assert quality.flag == "insufficient"
    assert quality.requestReframing is True
    assert "insufficient_average_keypoint_confidence" in quality.reasons


def test_occlusion_requests_reframing():
    confidences = np.array([0.8] * 8 + [0.05] * 9)
    quality = evaluate_pose_quality(
        person_confidence=0.9,
        keypoint_confidences=confidences,
        thresholds=THRESHOLDS,
    )

    assert quality.flag == "insufficient"
    assert "severe_occlusion" in quality.reasons


def test_no_visible_person_requests_reframing():
    quality = evaluate_pose_quality(
        person_confidence=None,
        keypoint_confidences=None,
        thresholds=THRESHOLDS,
    )

    assert quality.flag == "insufficient"
    assert quality.reasons == ["no_visible_person"]
