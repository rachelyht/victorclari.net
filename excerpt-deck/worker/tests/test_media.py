"""Rasterising, trimming, and the yt-dlp cookie/sign-in handling."""

from __future__ import annotations

import subprocess

import pytest
from app import media
from app.tools import ToolError, has_tool
from conftest import needs_ffmpeg, needs_poppler


def test_images_are_passed_through_untouched(tmp_path):
    image = tmp_path / "page.png"
    image.write_bytes(b"not really a png")
    assert media.rasterize_score(image, tmp_path, "page") == [image]


@needs_poppler
def test_pdf_pages_come_back_in_page_order(tmp_path):
    pdf = tmp_path / "score.pdf"
    pdf.write_bytes(_pdf(12))
    pages = media.rasterize_score(pdf, tmp_path, "full")
    assert len(pages) == 12
    assert [page.name for page in pages][:3] == ["full-01.png", "full-02.png", "full-03.png"]
    # page 10 must not sort before page 2
    assert pages[9].name.endswith("10.png")


@needs_ffmpeg
def test_trim_cuts_exactly_the_requested_window(tmp_path, make_clip):
    clip = media.trim(make_clip(duration=8), tmp_path / "cut.mp4", 2, 5)
    duration = float(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(clip)],
            capture_output=True, text=True, check=True,
        ).stdout
    )
    assert 2.8 < duration < 3.2
    assert media.poster(clip, tmp_path / "poster.png").exists()


def test_cookie_args_prefer_the_browser_over_a_file(monkeypatch):
    monkeypatch.delenv("YTDLP_COOKIES_FROM_BROWSER", raising=False)
    monkeypatch.delenv("YTDLP_COOKIES", raising=False)
    assert media.cookie_args() == []
    monkeypatch.setenv("YTDLP_COOKIES", "/tmp/cookies.txt")
    assert media.cookie_args() == ["--cookies", "/tmp/cookies.txt"]
    monkeypatch.setenv("YTDLP_COOKIES_FROM_BROWSER", "safari")
    assert media.cookie_args() == ["--cookies-from-browser", "safari"]


def test_the_sign_in_wall_becomes_an_actionable_error(tmp_path, monkeypatch):
    monkeypatch.delenv("YTDLP_COOKIES_FROM_BROWSER", raising=False)
    monkeypatch.delenv("YTDLP_COOKIES", raising=False)

    def refuse(command, args):
        raise ToolError("yt-dlp exited with 1: ERROR: [youtube] x: Sign in to confirm you're not a bot")

    monkeypatch.setattr(media, "run", refuse)
    with pytest.raises(ToolError, match="YTDLP_COOKIES_FROM_BROWSER"):
        media.download_youtube("https://youtu.be/x", tmp_path, "x")


def test_a_cached_download_is_reused(tmp_path, monkeypatch):
    (tmp_path / "abc.mp4").write_bytes(b"cached")
    monkeypatch.setattr(media, "run", lambda *_: pytest.fail("should not re-download"))
    assert media.download_youtube("https://youtu.be/abc", tmp_path, "abc").read_bytes() == b"cached"


def test_missing_tools_are_reported_rather_than_crashing():
    assert has_tool("definitely-not-a-tool-8f3a") is False


def _pdf(page_count: int) -> bytes:
    objects = [
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        f"2 0 obj<</Type/Pages/Count {page_count}"
        f"/Kids[{' '.join(f'{3 + i * 2} 0 R' for i in range(page_count))}]>>endobj",
    ]
    for i in range(page_count):
        content = f"BT /F1 24 Tf 72 700 Td (Page {i + 1}) Tj ET"
        objects.append(
            f"{3 + i * 2} 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]"
            f"/Contents {4 + i * 2} 0 R/Resources<</Font<</F1 <</Type/Font/Subtype/Type1"
            f"/BaseFont/Helvetica>>>>>>>>endobj"
        )
        objects.append(f"{4 + i * 2} 0 obj<</Length {len(content)}>>stream\n{content}\nendstream endobj")

    pdf = "%PDF-1.4\n"
    offsets = []
    for obj in objects:
        offsets.append(len(pdf))
        pdf += f"{obj}\n"
    xref = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n"
    pdf += f"trailer<</Size {len(objects) + 1}/Root 1 0 R>>\nstartxref\n{xref}\n%%EOF"
    return pdf.encode("latin-1")
