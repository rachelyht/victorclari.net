"""Job registry and the pipeline that turns a submitted manifest into a deck."""

from __future__ import annotations

import re
import shutil
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from .deck import Clip, compose_deck, image_key
from .media import download_youtube, poster, rasterize_score, trim

JOB_TTL_SEC = 6 * 60 * 60
YOUTUBE_ID = re.compile(r"[\w-]{11}")


@dataclass
class Job:
    id: str
    state: str = "running"
    message: str = "Queued"
    error: str | None = None
    deck_path: Path | None = None
    created_at: float = field(default_factory=time.time)


class JobStore:
    """In-memory jobs plus their work directories under `root`."""

    def __init__(self, root: Path):
        self.root = root
        self.cache = root / "cache"
        self.uploads = root / "uploads"
        for directory in (self.root, self.cache, self.uploads):
            directory.mkdir(parents=True, exist_ok=True)
        self._jobs: dict[str, Job] = {}

    def create(self) -> Job:
        job = Job(id=str(uuid.uuid4()))
        self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def work_dir(self, job: Job) -> Path:
        directory = self.root / job.id
        directory.mkdir(parents=True, exist_ok=True)
        return directory

    def sweep(self, now: float | None = None) -> None:
        now = now or time.time()
        for job_id, job in list(self._jobs.items()):
            if now - job.created_at < JOB_TTL_SEC:
                continue
            del self._jobs[job_id]
            shutil.rmtree(self.root / job_id, ignore_errors=True)

    def run(self, job: Job, manifest: dict, files: dict[str, Path]) -> None:
        try:
            build_deck(self, job, manifest, files)
        except Exception as error:  # surfaced to the browser as the job error
            job.state = "failed"
            job.error = str(error)


def _score_files(entry: dict) -> list[dict]:
    # A score can be split over several files; pages are numbered across them in order.
    return entry.get("files") or [entry]


def build_deck(store: JobStore, job: Job, manifest: dict, files: dict[str, Path]) -> Path:
    work_dir = store.work_dir(job)
    images: dict[str, Path] = {}
    clips: dict[str, Clip] = {}

    for excerpt in manifest["excerpts"]:
        name = excerpt.get("title") or excerpt["id"]

        for source in ("partScore", "fullScore"):
            entry = excerpt.get(source)
            if not entry:
                continue
            job.message = f"Rendering {'part' if source == 'partScore' else 'full'} score — {name}"
            page = 0
            for index, part in enumerate(_score_files(entry)):
                uploaded = files.get(part["field"])
                if not uploaded:
                    raise ValueError(f"missing upload for {part['field']}")
                stem = f"{source}_{excerpt['id']}_{index}"
                score = work_dir / f"{stem}{Path(part['name']).suffix.lower() or '.png'}"
                shutil.copyfile(uploaded, score)
                for rendered in rasterize_score(score, work_dir, stem):
                    images[image_key(excerpt["id"], source, page)] = rendered
                    page += 1

        video = excerpt["video"]
        if video.get("source") == "youtube":
            job.message = f"Downloading video — {name}"
            match = YOUTUBE_ID.search(video.get("url") or "")
            source_video = download_youtube(
                video["url"], store.cache, match.group(0) if match else excerpt["id"]
            )
        else:
            uploaded = files.get((video.get("file") or {}).get("field"))
            if not uploaded:
                raise ValueError(f"missing video upload for {name}")
            source_video = work_dir / f"{excerpt['id']}-source.mp4"
            shutil.copyfile(uploaded, source_video)

        job.message = f"Trimming video — {name}"
        clip = trim(
            source_video,
            work_dir / f"{excerpt['id']}-clip.mp4",
            video.get("startSec") or 0,
            video.get("endSec") or 0,
        )
        cover: Path | None = work_dir / f"{excerpt['id']}-poster.png"
        try:
            poster(clip, cover)
        except Exception:
            cover = None

        clips[excerpt["id"]] = Clip(
            path=clip,
            poster=cover,
            start_sec=video.get("startSec"),
            end_sec=video.get("endSec"),
            trimmed=True,
        )

    job.message = "Composing slides"
    job.deck_path = compose_deck(
        manifest["plan"],
        images,
        clips,
        work_dir / "deck.pptx",
        title=manifest.get("title") or "Excerpt deck",
    )
    job.state = "done"
    job.message = "Deck ready"
    return job.deck_path
