import base64
import re
from time import perf_counter
from pathlib import Path

import cv2
import numpy as np

from .contracts import KEYPOINT_NAMES, PoseBatchResponse, PoseFrameSample, PoseKeypoint, SamplingConfig
from .quality import QualityThresholds, evaluate_pose_quality, insufficient_quality
from .settings import Settings


DATA_URL_PATTERN = re.compile(r"^data:image/[^;]+;base64,", re.IGNORECASE)


class PosePipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None

    @property
    def model(self):
        if self._model is None:
            from ultralytics import YOLO

            self._model = YOLO(self.settings.model_path)
        return self._model

    def process_video(self, path: Path, sample_fps: float | None = None) -> PoseBatchResponse:
        requested_fps = sample_fps or self.settings.sample_fps
        capture = cv2.VideoCapture(str(path))
        if not capture.isOpened():
            raise ValueError("VideoCapture could not open the supplied video.")

        source_fps = capture.get(cv2.CAP_PROP_FPS) or requested_fps
        if source_fps <= 0:
            source_fps = requested_fps
        frame_interval = max(int(round(source_fps / requested_fps)), 1)
        samples: list[PoseFrameSample] = []
        frame_index = 0

        try:
            while len(samples) < self.settings.max_samples:
                ok, frame = capture.read()
                if not ok:
                    break
                if frame_index % frame_interval == 0:
                    timestamp_ms = capture.get(cv2.CAP_PROP_POS_MSEC)
                    if timestamp_ms <= 0:
                        timestamp_ms = (frame_index / source_fps) * 1000
                    samples.append(self.process_frame(frame, frame_index=frame_index, timestamp_ms=timestamp_ms))
                frame_index += 1
        finally:
            capture.release()

        return self._response(
            samples,
            SamplingConfig(
                requestedFps=requested_fps,
                sourceFps=source_fps,
                frameInterval=frame_interval,
                maxSamples=self.settings.max_samples,
                processedSamples=len(samples),
            ),
        )

    def process_frame_batch(self, encoded_frames: list[tuple[float, str]], sample_fps: float | None = None) -> PoseBatchResponse:
        requested_fps = sample_fps or self.settings.sample_fps
        selected_frames = _sample_frame_batch(encoded_frames, requested_fps, self.settings.max_samples)
        samples = []
        decode_ms = 0.0
        processing_ms = 0.0
        for frame_index, timestamp_ms, image_base64 in selected_frames:
            start = perf_counter()
            frame = _decode_base64_image(image_base64)
            decode_ms += (perf_counter() - start) * 1000
            start = perf_counter()
            samples.append(self.process_frame(frame, frame_index=frame_index, timestamp_ms=timestamp_ms))
            processing_ms += (perf_counter() - start) * 1000
        frame_interval = max(1, int(round(len(encoded_frames) / max(len(selected_frames), 1))))
        response = self._response(
            samples,
            SamplingConfig(
                requestedFps=requested_fps,
                sourceFps=None,
                frameInterval=frame_interval,
                maxSamples=self.settings.max_samples,
                processedSamples=len(samples),
            ),
        )
        response.timingsMs = {"jpegDecode": round(decode_ms, 1), "poseInferenceAndQuality": round(processing_ms, 1)}
        return response

    def process_frame(self, frame: np.ndarray, *, frame_index: int, timestamp_ms: float) -> PoseFrameSample:
        prediction = self.model.predict(
            source=frame,
            conf=self.settings.yolo_confidence,
            verbose=False,
            device=self.settings.device,
        )
        if not prediction:
            return _insufficient_sample(frame_index, timestamp_ms)

        result = prediction[0]
        if result.keypoints is None or result.keypoints.xy is None or len(result.keypoints.xy) == 0:
            return _insufficient_sample(frame_index, timestamp_ms)

        xy = result.keypoints.xy.cpu().numpy()
        confidences = result.keypoints.conf.cpu().numpy() if result.keypoints.conf is not None else None
        if confidences is None or xy.shape[0] == 0 or confidences.shape[0] == 0:
            return _insufficient_sample(frame_index, timestamp_ms)

        person_confidences = result.boxes.conf.cpu().numpy() if result.boxes is not None and result.boxes.conf is not None else None
        if person_confidences is not None and np.count_nonzero(person_confidences >= self.settings.min_person_confidence) > 1:
            return PoseFrameSample(
                frameIndex=frame_index,
                timestampMs=timestamp_ms,
                quality=insufficient_quality(["multiple_people"]),
                keypoints=None,
            )
        person_index = int(np.argmax(person_confidences)) if person_confidences is not None and len(person_confidences) else 0
        person_confidence = float(person_confidences[person_index]) if person_confidences is not None and len(person_confidences) else None

        if person_index >= xy.shape[0] or person_index >= confidences.shape[0]:
            return _insufficient_sample(frame_index, timestamp_ms)

        quality = evaluate_pose_quality(
            person_confidence=person_confidence,
            keypoint_confidences=confidences[person_index],
            thresholds=QualityThresholds(
                min_person_confidence=self.settings.min_person_confidence,
                min_keypoint_confidence=self.settings.min_keypoint_confidence,
                min_visible_keypoints=self.settings.min_visible_keypoints,
                min_avg_keypoint_confidence=self.settings.min_avg_keypoint_confidence,
            ),
        )

        if quality.flag == "insufficient":
            return PoseFrameSample(frameIndex=frame_index, timestampMs=timestamp_ms, quality=quality, keypoints=None)

        keypoints = [
            PoseKeypoint(
                name=name,
                x=float(xy[person_index][index][0]),
                y=float(xy[person_index][index][1]),
                confidence=float(confidences[person_index][index]),
            )
            for index, name in enumerate(KEYPOINT_NAMES)
        ]
        return PoseFrameSample(frameIndex=frame_index, timestampMs=timestamp_ms, quality=quality, keypoints=keypoints)

    def _response(self, frames: list[PoseFrameSample], sampling: SamplingConfig) -> PoseBatchResponse:
        request_reframing = not frames or any(frame.quality.flag == "insufficient" for frame in frames)
        return PoseBatchResponse(
            status="insufficient_quality" if request_reframing else "ok",
            requestReframing=request_reframing,
            sampling=sampling,
            frames=frames,
        )


def _insufficient_sample(frame_index: int, timestamp_ms: float) -> PoseFrameSample:
    return PoseFrameSample(
        frameIndex=frame_index,
        timestampMs=timestamp_ms,
        quality=insufficient_quality(["no_visible_person"]),
        keypoints=None,
    )


def _decode_base64_image(image_base64: str) -> np.ndarray:
    clean_value = DATA_URL_PATTERN.sub("", image_base64.strip())
    image_bytes = base64.b64decode(clean_value, validate=True)
    buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode base64 image frame.")
    return frame


def _sample_frame_batch(
    encoded_frames: list[tuple[float, str]],
    requested_fps: float,
    max_samples: int,
) -> list[tuple[int, float, str]]:
    min_delta_ms = 1000 / requested_fps
    selected: list[tuple[int, float, str]] = []
    last_selected_ms: float | None = None

    for frame_index, (timestamp_ms, image_base64) in enumerate(encoded_frames):
        # Browser timers can fire a few milliseconds early; keep near-target samples.
        if last_selected_ms is None or timestamp_ms - last_selected_ms + 20 >= min_delta_ms:
            selected.append((frame_index, timestamp_ms, image_base64))
            last_selected_ms = timestamp_ms
        if len(selected) >= max_samples:
            break

    if not selected and encoded_frames:
        timestamp_ms, image_base64 = encoded_frames[0]
        selected.append((0, timestamp_ms, image_base64))

    return selected
