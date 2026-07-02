#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(jj log -r @ --no-graph -T 'change_id.short()' | cut -c1-8)"
target="apps/web-wrapper/index.html"

python3 - "$target" "$version" <<'PY'
import re
import sys
from pathlib import Path

target = Path(sys.argv[1])
version = sys.argv[2]
text = target.read_text()
updated, count = re.subn(
    r'<p class="build-version">Version [^<]+</p>',
    f'<p class="build-version">Version {version}</p>',
    text,
    count=1,
)
if count != 1:
    raise SystemExit(f"Expected one build-version element in {target}")
target.write_text(updated)
PY

echo "Synced review wrapper version to ${version}"
