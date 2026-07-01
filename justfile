default:
    just --list

# Restore Godot material tweaks that can be clobbered by GLB reimports.
restore-godot-materials:
    bash scripts/restore-godot-materials.sh

# Serve the static web wrapper review page.
serve-web-wrapper:
    python3 -m http.server 4173
