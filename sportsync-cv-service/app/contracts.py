from typing import Literal

from pydantic import BaseModel, Field


SchemaVersion = Literal["krid.cv.pose.v1"]
ResponseStatus = Literal["ok", "insufficient_quality"]
FrameQualityFlag = Literal["sufficient", "insufficient"]
QualityReasonCode = Literal[
    "no_visible_person",
    "multiple_people",
    "severe_occlusion",
    "insufficient_average_keypoint_confidence",
]
KeypointName = Literal[
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

KEYPOINT_NAMES: tuple[KeypointName, ...] = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
)


class PoseKeypoint(BaseModel):
    name: KeypointName
    x: float = Field(description="X coordinate in source-frame pixels.")
    y: float = Field(description="Y coordinate in source-frame pixels.")
    confidence: float = Field(ge=0, le=1, description="YOLOv8-Pose per-keypoint confidence.")


class FrameQuality(BaseModel):
    flag: FrameQualityFlag
    requestReframing: bool
    reasons: list[QualityReasonCode] = Field(default_factory=list)
    message: str
    personConfidence: float | None = Field(default=None, ge=0, le=1)
    averageKeypointConfidence: float | None = Field(default=None, ge=0, le=1)
    visibleKeypointCount: int = Field(ge=0, le=17)


class PoseFrameSample(BaseModel):
    frameIndex: int = Field(ge=0)
    timestampMs: float = Field(ge=0)
    quality: FrameQuality
    keypoints: list[PoseKeypoint] | None = Field(
        description=(
            "Exactly 17 YOLOv8-Pose keypoints when quality.flag is sufficient. "
            "Null when quality is insufficient; callers must request reframing."
        )
    )


class SamplingConfig(BaseModel):
    requestedFps: float = Field(gt=0)
    sourceFps: float | None = Field(default=None, gt=0)
    frameInterval: int = Field(ge=1)
    maxSamples: int = Field(ge=1)
    processedSamples: int = Field(ge=0)


class PoseBatchResponse(BaseModel):
    schemaVersion: SchemaVersion = "krid.cv.pose.v1"
    status: ResponseStatus
    requestReframing: bool
    sampling: SamplingConfig
    frames: list[PoseFrameSample]
    timingsMs: dict[str, float] | None = None


class FrameInput(BaseModel):
    timestampMs: float = Field(ge=0)
    imageBase64: str = Field(description="Base64-encoded image bytes. Data URLs are accepted.")


class FrameBatchRequest(BaseModel):
    sampleFps: float | None = Field(default=None, gt=0)
    frames: list[FrameInput] = Field(min_length=1)
