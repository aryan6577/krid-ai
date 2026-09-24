import os
from dataclasses import dataclass


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return float(value)


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return int(value)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    service_name: str
    schema_version: str
    api_key: str | None
    require_https: bool
    model_path: str
    sample_fps: float
    max_samples: int
    yolo_confidence: float
    min_person_confidence: float
    min_keypoint_confidence: float
    min_visible_keypoints: int
    min_avg_keypoint_confidence: float
    device: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            service_name="krid-cv-pose-service",
            schema_version="krid.cv.pose.v1",
            api_key=os.getenv("KRID_CV_API_KEY") or None,
            require_https=_bool_env("KRID_CV_REQUIRE_HTTPS", False),
            model_path=os.getenv("KRID_CV_MODEL_PATH", "yolov8n-pose.pt"),
            sample_fps=_float_env("KRID_CV_SAMPLE_FPS", 5.0),
            max_samples=_int_env("KRID_CV_MAX_SAMPLES", 120),
            yolo_confidence=_float_env("KRID_CV_YOLO_CONFIDENCE", 0.25),
            min_person_confidence=_float_env("KRID_CV_MIN_PERSON_CONFIDENCE", 0.35),
            min_keypoint_confidence=_float_env("KRID_CV_MIN_KEYPOINT_CONFIDENCE", 0.30),
            min_visible_keypoints=_int_env("KRID_CV_MIN_VISIBLE_KEYPOINTS", 12),
            min_avg_keypoint_confidence=_float_env("KRID_CV_MIN_AVG_KEYPOINT_CONFIDENCE", 0.45),
            device=os.getenv("KRID_CV_DEVICE") or None,
        )
