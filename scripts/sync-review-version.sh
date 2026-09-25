#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version="$(jj log -r @ --no-graph -T 'change_id.short()' | cut -c1-8)"
updated_at="$(date '+%Y-%m-%d %H:%M %Z')"
printf '%s\n' "$version" > BUILD_VERSION

python3 - "$version" "$updated_at" apps/web-wrapper/*.html <<'PY'
import re
import hashlib
import sys
from pathlib import Path

version = sys.argv[1]
updated_at = sys.argv[2]
targets = [Path(path) for path in sys.argv[3:]]
updated_targets = []

for target in targets:
    text = target.read_text()
    updated, count = re.subn(
        r'<p class="build-version">Version [^<]+</p>',
        f'<p class="build-version">Version {version} · Updated {updated_at}</p>',
        text,
        count=1,
    )
    if count == 0:
        continue
    if count != 1:
        raise SystemExit(f"Expected at most one build-version element in {target}")
    def cache_bust_asset(match: re.Match[str]) -> str:
        attribute_and_path = match.group(1)
        relative_path = match.group(2)
        asset_path = target.parent / relative_path
        if not asset_path.is_file():
            raise SystemExit(f"Missing referenced wrapper asset: {asset_path}")
        content_hash = hashlib.sha256(asset_path.read_bytes()).hexdigest()[:8]
        return f'{attribute_and_path}?v={version}-{content_hash}"'

    updated = re.sub(
        r'((?:href|src)="\./((?:styles|server-debug|wrapper|server-client-launcher|room-entry|paid-client|free-entry|free-client)\.(?:css|js)))(?:\?v=[^"]*)?"',
        cache_bust_asset,
        updated,
    )
    target.write_text(updated)
    updated_targets.append(str(target))

if not updated_targets:
    raise SystemExit("Expected at least one build-version element in web wrapper pages")
PY

echo "Synced project version to ${version}"
