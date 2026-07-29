"""
Local job runner for the excerpts the browser cannot handle on its own: YouTube downloads
(yt-dlp) and exact trims (ffmpeg). The deck is composed from the same SlidePlan the storyboard
previews, so the worker output matches the offline export.

Run with: uvicorn app.main:app --port 8787
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .jobs import JobStore
from .tools import has_tool

ROOT = Path(os.environ.get("WORK_DIR") or Path(tempfile.gettempdir()) / "excerpt-deck-jobs")

app = FastAPI(title="excerpt-deck worker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
store = JobStore(ROOT)


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "ytdlp": has_tool("yt-dlp"),
        "ffmpeg": has_tool("ffmpeg"),
        "pdftoppm": has_tool("pdftoppm"),
    }


@app.post("/jobs")
async def create_job(
    background: BackgroundTasks,
    manifest: str = Form(...),
    files: list[UploadFile] = File(default_factory=list),
) -> dict:
    try:
        parsed = json.loads(manifest)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="manifest is not valid JSON")

    store.sweep()
    job = store.create()
    # The browser names each part after its manifest field, so uploads are keyed by field name.
    uploads: dict[str, Path] = {}
    for index, upload in enumerate(files):
        target = store.uploads / f"{job.id}-{index}"
        with target.open("wb") as sink:
            shutil.copyfileobj(upload.file, sink)
        uploads[upload.filename] = target

    background.add_task(store.run, job, parsed, uploads)
    return {"jobId": job.id}


@app.get("/jobs/{job_id}")
def job_state(job_id: str) -> dict:
    job = store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="unknown job")
    return {"state": job.state, "message": job.message, "error": job.error}


@app.get("/jobs/{job_id}/download")
def download(job_id: str) -> FileResponse:
    job = store.get(job_id)
    if not job or job.state != "done" or not job.deck_path:
        raise HTTPException(status_code=404, detail="deck is not ready")
    return FileResponse(
        job.deck_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="deck.pptx",
    )
