"""Drives the worker over HTTP the way the browser does, with a score split over three files."""

from __future__ import annotations

import json
import zipfile

import pytest
from conftest import needs_ffmpeg, plan_for
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("WORK_DIR", str(tmp_path / "jobs"))
    import importlib

    from app import main

    importlib.reload(main)
    with TestClient(main.app) as test_client:
        yield test_client


def test_health_reports_the_tools_it_found(client):
    body = client.get("/health").json()
    assert body["ok"] is True
    assert set(body) == {"ok", "ytdlp", "ffmpeg", "pdftoppm"}


def test_a_broken_manifest_is_rejected(client):
    assert client.post("/jobs", data={"manifest": "{not json"}).status_code == 400


def test_unknown_jobs_are_404(client):
    assert client.get("/jobs/nope").status_code == 404
    assert client.get("/jobs/nope/download").status_code == 404


@needs_ffmpeg
def test_worker_builds_a_deck_from_a_score_split_over_several_files(client, make_page, make_clip):
    excerpt_id = "exc1"
    part = make_page("part.png", "Part")
    full = [make_page(f"f{index}.png", f"Full {index + 1}") for index in range(3)]
    clip = make_clip()

    manifest = {
        "title": "NSO audition",
        "plan": plan_for(excerpt_id, full_pages=3),
        "excerpts": [
            {
                "id": excerpt_id,
                "title": "Mahler 1",
                "video": {
                    "source": "upload",
                    "startSec": 2,
                    "endSec": 5,
                    "file": {"field": f"video:{excerpt_id}", "name": "clip.mp4"},
                },
                "partScore": {"files": [{"field": f"partScore:{excerpt_id}:0", "name": "part.png"}]},
                "fullScore": {
                    "files": [
                        {"field": f"fullScore:{excerpt_id}:{index}", "name": file.name}
                        for index, file in enumerate(full)
                    ]
                },
            }
        ],
    }

    # The browser sends every part as a `files` entry whose filename is its manifest field.
    uploads = [("files", (f"partScore:{excerpt_id}:0", part.read_bytes(), "image/png"))]
    uploads += [
        ("files", (f"fullScore:{excerpt_id}:{index}", file.read_bytes(), "image/png"))
        for index, file in enumerate(full)
    ]
    uploads.append(("files", (f"video:{excerpt_id}", clip.read_bytes(), "video/mp4")))

    created = client.post("/jobs", data={"manifest": json.dumps(manifest)}, files=uploads)
    assert created.status_code == 200
    job_id = created.json()["jobId"]

    state = client.get(f"/jobs/{job_id}").json()
    assert state["state"] == "done", f"job failed: {state.get('error') or state.get('message')}"

    download = client.get(f"/jobs/{job_id}/download")
    assert download.status_code == 200
    deck_path = part.parent / "deck.pptx"
    deck_path.write_bytes(download.content)

    with zipfile.ZipFile(deck_path) as archive:
        slides = [name for name in archive.namelist() if name.startswith("ppt/slides/slide")]
        media = [name for name in archive.namelist() if name.startswith("ppt/media/")]
    assert len(slides) == 3, "part slide + two full-score slides"
    assert len([name for name in media if name.endswith(".mp4")]) == 1, "trimmed clip embedded once"
    assert len([name for name in media if name.endswith(".png")]) == 5


def test_backwards_compatible_single_file_scores(client, make_page, make_clip):
    """Older drafts sent one `{field, name}` per score rather than a `files` list."""
    from app.jobs import _score_files

    assert _score_files({"field": "partScore:e:0", "name": "p.png"}) == [
        {"field": "partScore:e:0", "name": "p.png"}
    ]
    assert _score_files({"files": [{"field": "a"}, {"field": "b"}]}) == [{"field": "a"}, {"field": "b"}]
