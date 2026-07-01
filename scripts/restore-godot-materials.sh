#!/usr/bin/env bash
set -euo pipefail

source_rev="${1:-main}"
script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(CDPATH= cd -- "${script_dir}/.." && pwd)"

cd "${repo_root}"

jj restore --from "${source_rev}" godot/assets/Material.002.tres

printf 'Restored godot/assets/Material.002.tres from %s\n' "${source_rev}"
