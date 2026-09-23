# Krid.ai CV Pose Service

Standalone Python perception service used by the web camera flow. The authenticated Express
API forwards sampled JPEG frames here and passes the frozen pose-output contract to its
exercise and tutorial rule engines. The CV service does not store raw video by default.

## Scope

In scope:

- OpenCV `VideoCapture` frame capture for uploaded videos
- configurable frame sampling so inference does not run on every video frame
- YOLOv8-Pose inference
- 17 COCO-format pose keypoints with per-keypoint confidence
- quality gating for no visible person, severe occlusion, and low average keypoint confidence
- explicit `insufficient_quality` responses that ask callers to request reframing

Out of scope:

- rep counting
- form or technique rules
- exercise-specific thresholds
- tutorial checkpoints
- camera permission handling (handled by the web app)
- frontend framing guidance UI (handled by the web app)

## Frozen Output Contract

The shared contract is in `contracts/pose_keypoints.openapi.yaml`. The Python typed version is
in `app/contracts.py`.

For each processed sample:

- `timestampMs`
- `frameIndex`
- `quality.flag`
- `quality.requestReframing`
- `quality.reasons`
- `keypoints`

When `quality.flag` is `sufficient`, `keypoints` contains exactly 17 YOLOv8-Pose keypoints:

`nose`, `left_eye`, `right_eye`, `left_ear`, `right_ear`, `left_shoulder`, `right_shoulder`,
`left_elbow`, `right_elbow`, `left_wrist`, `right_wrist`, `left_hip`, `right_hip`,
`left_knee`, `right_knee`, `left_ankle`, `right_ankle`.

When quality is insufficient, `keypoints` is `null`. The service never fabricates or
interpolates missing keypoints.

## Run Locally

```bash
cd sportsync-cv-service
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export KRID_CV_API_KEY=local-dev-token
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

The first YOLO run downloads `yolov8n-pose.pt` unless `KRID_CV_MODEL_PATH` points to a local
model file.
The service warms the model during startup so the first camera request does not pay the cold-inference cost. Batch responses include optional `timingsMs` for JPEG decoding and pose processing; the web camera panel also shows capture, encoding, round trip and UI timings. The model and quality thresholds remain configurable and unchanged by this audit.

## Docker

```bash
docker build -t krid-cv-pose .
docker run --rm -p 8001:8001 --env-file .env krid-cv-pose
```

In production, set `KRID_CV_API_KEY` and terminate TLS at the ingress or proxy. If the proxy
sets `X-Forwarded-Proto`, set `KRID_CV_REQUIRE_HTTPS=true` to reject non-HTTPS uploads.

For local tests, install `requirements-dev.txt` and run `python -m pytest -q`.

## Endpoints

`GET /healthz`

Returns service health and schema version.

`POST /v1/pose/video`

Multipart upload:

- header `X-Krid-CV-Key`
- field `video`: video file
- optional form field `sampleFps`

`POST /v1/pose/frames`

JSON frame batch:

```json
{
  "sampleFps": 5,
  "frames": [
    {
      "timestampMs": 0,
      "imageBase64": "..."
    }
  ]
}
```

The frame-batch endpoint also applies `sampleFps` by timestamp before running inference, so
callers may send denser frame batches without forcing inference on every frame.

## Quality Gates

Configurable environment variables:

- `KRID_CV_MIN_PERSON_CONFIDENCE`
- `KRID_CV_MIN_KEYPOINT_CONFIDENCE`
- `KRID_CV_MIN_VISIBLE_KEYPOINTS`
- `KRID_CV_MIN_AVG_KEYPOINT_CONFIDENCE`

Any failed quality gate marks that frame as `insufficient` and returns no keypoints for it.
