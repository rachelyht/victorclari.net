"""Score rasterising and video download/trim — everything the browser cannot do itself."""

from __future__ import annotations

import os
import re
from pathlib import Path

from .tools import ToolError, run

RASTER_DPI = 150
BOT_WALL = re.compile(r"not a bot|Sign in to confirm", re.IGNORECASE)


def rasterize_score(file: Path, output_dir: Path, prefix: str) -> list[Path]:
    """Rasterises a score to PNGs in page order. Images are returned untouched."""
    if file.suffix.lower() != ".pdf":
        return [file]
    run("pdftoppm", ["-r", str(RASTER_DPI), "-png", str(file), str(output_dir / prefix)])
    pages = output_dir.glob(f"{prefix}-*.png")
    return sorted(pages, key=lambda page: int(re.search(r"-(\d+)\.png$", page.name).group(1)))


def cookie_args() -> list[str]:
    """
    YouTube answers some requests with "Sign in to confirm you're not a bot"; passing the cookies
    of a signed-in browser is the documented way through, so both forms are configurable:
      YTDLP_COOKIES_FROM_BROWSER=safari|chrome|firefox   YTDLP_COOKIES=/path/to/cookies.txt
    """
    browser = os.environ.get("YTDLP_COOKIES_FROM_BROWSER")
    if browser:
        return ["--cookies-from-browser", browser]
    file = os.environ.get("YTDLP_COOKIES")
    return ["--cookies", file] if file else []


def download_youtube(url: str, cache_dir: Path, video_id: str) -> Path:
    """Downloads a YouTube video as mp4, reusing the file when several excerpts share a video."""
    output = cache_dir / f"{video_id}.mp4"
    if output.exists():
        return output
    cookies = cookie_args()
    try:
        run(
            "yt-dlp",
            [
                "--no-playlist",
                "--no-progress",
                *cookies,
                "-f",
                "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "--merge-output-format",
                "mp4",
                "-o",
                str(output),
                url,
            ],
        )
    except ToolError as error:
        if BOT_WALL.search(str(error)) and not cookies:
            raise ToolError(
                "YouTube asked yt-dlp to sign in. Restart the worker with "
                "YTDLP_COOKIES_FROM_BROWSER=safari (or chrome/firefox) so it can use your "
                "browser session."
            ) from error
        raise
    return output


def trim(source: Path, output: Path, start_sec: float, end_sec: float) -> Path:
    """Exact, keyframe-independent trim (re-encodes) so the clip starts precisely on the timestamp."""
    run(
        "ffmpeg",
        [
            "-y",
            "-ss", str(start_sec),
            "-to", str(end_sec),
            "-i", str(source),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-movflags", "+faststart",
            str(output),
        ],
    )
    return output


def poster(source: Path, output: Path, at_sec: float = 0) -> Path:
    run("ffmpeg", ["-y", "-ss", str(at_sec), "-i", str(source), "-frames:v", "1", str(output)])
    return output
