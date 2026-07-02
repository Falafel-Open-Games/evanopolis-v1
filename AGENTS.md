# Evanopolis V1 - Agent Notes

This file is the Codex-facing source of truth for workflow and engineering
constraints in this repo.

## Workflow Notes

- For PR workflow and version control guidance, use `jj` (not git).
- Always track PR bookmarks with origin using `jj bookmark track <branch-name>@origin`.
- Push is the final step and is done by the user (keyed); do not run `jj git push` yourself.
- When cutting a PR, pick a branch name yourself and track the bookmark with origin without asking.
- Commit messages must use a one-line Conventional Commit summary, then a blank line, then a fuller descriptive summary.
- Use `jj describe` to finalize PR changes instead of `jj commit` to avoid creating a new empty revision.
- When writing multi-line messages with `jj describe -m`, use a literal blank line inside the quoted string. Do not type `\n` or `\\n`.
- If a repo or app has a build-id sync step equivalent to `just sync-build-id`, run it before opening a PR.
- Before "commit and main" or any review publish flow, run `just sync-review-version` so the web wrapper version label matches the current `jj` change id.

## GDScript Preferences

Apply these in Godot code unless a local file or subsystem already has a stronger established pattern:

- Avoid type inference syntax like `:=`.
- Use explicit types to prevent Variant inference warnings.
- Prefer fail-fast checks for required nodes; avoid silent `null` guards.
- Use asserts and fail-fast behavior instead of defensive early returns when invariants are under our control.
- Use direct autoload access when the dependency is required.
- Avoid redundant clamps when UI options are controlled and aligned with code enums.
- Avoid variable names that shadow Node properties such as `name`, `owner`, or `hash`.
- Use 4-space indentation.
- Prefer `snake_case` for variables and functions and `PascalCase` via `class_name` for Godot classes.
