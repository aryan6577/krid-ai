import shutil
import tempfile
from contextlib import asynccontextmanager
import numpy as np
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile, status

from .contracts import FrameBatchRequest, PoseBatchResponse
from .pipeline import PosePipeline
from .settings import Settings

settings = Settings.from_env()
pipeline = PosePipeline(settings)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Pay the model's first-prediction cost before accepting camera requests.
    pipeline.model.predict(source=np.zeros((240, 320, 3), dtype=np.uint8), conf=settings.yolo_confidence, verbose=False, device=settings.device)
    yield


app = FastAPI(
    title="Krid.ai CV Pose Service",
    version="0.1.0",
    description=(
        "Standalone perception-only service. Captures sampled frames with OpenCV, runs "
        "YOLOv8-Pose, and returns frozen keypoint JSON for downstream rule engines."
    ),
    lifespan=lifespan,
)


async def require_transport_and_key(
    request: Request,
    x_krid_cv_key: Annotated[str | None, Header(alias="X-Krid-CV-Key")] = None,
) -> None:
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    if settings.require_https and forwarded_proto != "https":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Secure transport is required for CV uploads.",
        )
    if settings.api_key and x_krid_cv_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid CV service API key.")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name, "schemaVersion": settings.schema_version}


@app.post(
    "/v1/pose/video",
    response_model=PoseBatchResponse,
    dependencies=[Depends(require_transport_and_key)],
)
async def process_video(
    video: Annotated[UploadFile, File(description="Video file to sample and process with YOLOv8-Pose.")],
    sampleFps: Annotated[float | None, Form(gt=0)] = None,
) -> PoseBatchResponse:
    suffix = Path(video.filename or "upload.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        temp_path = Path(tmp.name)
        shutil.copyfileobj(video.file, tmp)
    try:
        return pipeline.process_video(temp_path, sample_fps=sampleFps)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    finally:
        temp_path.unlink(missing_ok=True)


@app.post(
    "/v1/pose/frames",
    response_model=PoseBatchResponse,
    dependencies=[Depends(require_transport_and_key)],
)
def process_frames(payload: FrameBatchRequest) -> PoseBatchResponse:
    try:
        return pipeline.process_frame_batch(
            [(frame.timestampMs, frame.imageBase64) for frame in payload.frames],
            sample_fps=payload.sampleFps,
        )
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
