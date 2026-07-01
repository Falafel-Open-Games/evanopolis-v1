default:
    just --list

# Restore Godot material tweaks that can be clobbered by GLB reimports.
restore-godot-materials:
    bash scripts/restore-godot-materials.sh
