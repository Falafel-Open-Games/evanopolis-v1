#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GAME_DIR = ROOT / "apps" / "web-wrapper" / "game"
INDEX_HTML = GAME_DIR / "index.html"
INDEX_PCK = GAME_DIR / "index.pck"


def main() -> None:
    version = read_build_version()
    versioned_pck_name = f"index-{version}.pck"
    versioned_pck = GAME_DIR / versioned_pck_name

    if not INDEX_HTML.exists():
        raise SystemExit(f"Missing Godot Web index: {INDEX_HTML}")
    if not INDEX_PCK.exists():
        raise SystemExit(f"Missing Godot Web pack: {INDEX_PCK}")

    for old_pack in GAME_DIR.glob("index-*.pck"):
        if old_pack.name != versioned_pck_name:
            old_pack.unlink()

    shutil.copyfile(INDEX_PCK, versioned_pck)

    html = INDEX_HTML.read_text()
    html = patch_godot_config(html, versioned_pck_name, versioned_pck.stat().st_size)
    INDEX_HTML.write_text(html)
    print(f"Godot Web export now loads {versioned_pck_name}")


def read_build_version() -> str:
    try:
        change_id = subprocess.check_output(
            ["jj", "log", "--ignore-working-copy", "-r", "@", "--no-graph", "-T", "change_id.short()"],
            cwd=ROOT,
            text=True,
        ).strip()
        return sanitize_version(change_id[:8])
    except (OSError, subprocess.CalledProcessError):
        build_version_path = ROOT / "BUILD_VERSION"
        if build_version_path.exists():
            return sanitize_version(build_version_path.read_text().strip())

    raise SystemExit("Could not derive a build version for Godot Web cache busting")


def sanitize_version(version: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_.-]", "-", version)
    if sanitized == "":
        raise SystemExit("Could not derive a build version for Godot Web cache busting")

    return sanitized


def patch_godot_config(html: str, versioned_pck_name: str, pck_size: int) -> str:
    match = re.search(r"const GODOT_CONFIG = (\{.*?\});", html)
    if match is None:
        raise SystemExit("Could not find GODOT_CONFIG in Godot Web index.html")

    config = json.loads(match.group(1))
    config["mainPack"] = versioned_pck_name
    file_sizes = config.get("fileSizes", {})
    if not isinstance(file_sizes, dict):
        file_sizes = {}
    file_sizes[versioned_pck_name] = pck_size
    config["fileSizes"] = file_sizes

    next_config = json.dumps(config, separators=(",", ":"))
    return html[: match.start(1)] + next_config + html[match.end(1) :]


if __name__ == "__main__":
    main()
