"""Thin wrapper around the external binaries the worker drives."""

from __future__ import annotations

import subprocess

VERSION_FLAGS = ("-version", "--version", "-v")


class ToolError(RuntimeError):
    pass


def run(command: str, args: list[str]) -> None:
    """Runs a tool, raising ToolError with the last stderr line on failure."""
    try:
        completed = subprocess.run(
            [command, *args], capture_output=True, text=True, check=False
        )
    except FileNotFoundError as error:
        raise ToolError(f"{command} could not be started: {error}") from error
    if completed.returncode != 0:
        last = (completed.stderr or "").strip().splitlines()
        raise ToolError(f"{command} exited with {completed.returncode}: {last[-1] if last else ''}")


def has_tool(command: str) -> bool:
    # poppler's tools only answer to -v, ffmpeg only to -version.
    for flag in VERSION_FLAGS:
        try:
            run(command, [flag])
            return True
        except ToolError:
            continue
    return False
