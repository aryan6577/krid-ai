import numpy as np

from app.pipeline import PosePipeline, _sample_frame_batch
from app.contracts import SamplingConfig
from app.settings import Settings


class TensorStub:
    def __init__(self, values):
        self.values = np.asarray(values)

    def __len__(self):
        return len(self.values)

    def cpu(self):
        return self

    def numpy(self):
        return self.values


class ModelStub:
    def predict(self, **_kwargs):
        keypoints = type("Keypoints", (), {
            "xy": TensorStub(np.zeros((2, 17, 2))),
            "conf": TensorStub(np.full((2, 17), 0.9)),
        })()
        boxes = type("Boxes", (), {"conf": TensorStub([0.9, 0.8])})()
        return [type("Result", (), {"keypoints": keypoints, "boxes": boxes})()]


def test_multiple_people_are_not_analysed_as_one():
    pipeline = PosePipeline(Settings.from_env())
    pipeline._model = ModelStub()
    sample = pipeline.process_frame(np.zeros((240, 320, 3), dtype=np.uint8), frame_index=0, timestamp_ms=0)
    assert sample.keypoints is None
    assert sample.quality.flag == "insufficient"
    assert "multiple_people" in sample.quality.reasons


def test_near_interval_browser_frames_are_retained():
    frames = [(0, "a"), (196, "b"), (395, "c"), (595, "d")]
    selected = _sample_frame_batch(frames, requested_fps=5, max_samples=10)
    assert [item[2] for item in selected] == ["a", "b", "c", "d"]


def test_empty_video_does_not_report_success():
    pipeline = PosePipeline(Settings.from_env())
    response = pipeline._response([], SamplingConfig(requestedFps=5, sourceFps=30, frameInterval=6, maxSamples=120, processedSamples=0))
    assert response.status == "insufficient_quality"
    assert response.requestReframing is True
