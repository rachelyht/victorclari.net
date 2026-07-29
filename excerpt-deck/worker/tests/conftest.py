import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

SLIDE_PAGES = [{"w": 595, "h": 842}]

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
needs_poppler = pytest.mark.skipif(shutil.which("pdftoppm") is None, reason="poppler not installed")


@pytest.fixture
def make_page(tmp_path):
    """A white A4-ish PNG with a caption, so pages are visibly distinct in the deck."""

    def build(name: str, text: str) -> Path:
        file = tmp_path / name
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=white:s=595x842",
                "-vf", f"drawtext=text='{text}':fontcolor=black:fontsize=48:x=40:y=60",
                "-frames:v", "1", str(file),
            ],
            check=True,
            capture_output=True,
        )
        return file

    return build


@pytest.fixture
def make_clip(tmp_path):
    def build(name: str = "clip.mp4", duration: int = 8) -> Path:
        file = tmp_path / name
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", f"testsrc=size=320x180:rate=15:duration={duration}",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", str(file),
            ],
            check=True,
            capture_output=True,
        )
        return file

    return build


def plan_for(excerpt_id: str = "exc1", *, full_pages: int = 3) -> list[dict]:
    """
    A minimal stand-in for the browser's slide-plan rules: one part slide, then the full score
    two portrait pages per slide. The real rules live in web/js/slide-plan.js (tested there);
    the worker only has to execute whatever plan it is handed.
    """
    content = {"x": 0.22, "y": 0.105, "w": 0.755, "h": 0.87}
    video = {"excerptId": excerpt_id, "x": 0.025, "y": 0.77, "w": 0.18, "h": 0.18}
    plan = [
        {
            "id": f"{excerpt_id}:part",
            "excerptId": excerpt_id,
            "kind": "part",
            "title": "Mahler 1",
            "showTitle": True,
            "images": [{"source": "partScore", "page": 0, "rotate": 0, **content}],
            "video": dict(video),
        }
    ]
    for first in range(0, full_pages, 2):
        pages = [page for page in (first, first + 1) if page < full_pages]
        width = (content["w"] - 0.015) / 2 if len(pages) == 2 else content["w"]
        plan.append(
            {
                "id": f"{excerpt_id}:full:{first}",
                "excerptId": excerpt_id,
                "kind": "full",
                "title": f"Mahler 1 — full score p. {first + 1}",
                "showTitle": True,
                "images": [
                    {
                        "source": "fullScore",
                        "page": page,
                        "rotate": 0,
                        "x": content["x"] + index * (width + 0.015),
                        "y": content["y"],
                        "w": width,
                        "h": content["h"],
                    }
                    for index, page in enumerate(pages)
                ],
                "video": dict(video),
            }
        )
    return plan
