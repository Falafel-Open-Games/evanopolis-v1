# 0052 - Portfolio Special Effect Wrap

Date: 2026-09-13

## Status

- Done.

## Next Work

Show full special-property effect text in portfolio rows instead of truncating it
with ellipsis.

## Decision

- Keep terrain rows compact.
- Give special-property rows more height.
- Wrap the special-property effect line so the portfolio can be used as the
  effect reference.

## Expected Outcome

- Special-property effects are readable from the portfolio without needing
  another screen.

## Implementation Notes

- Special-property rows now use a taller minimum height.
- The special-property effect label wraps instead of trimming with ellipsis.
- Added a test assertion for the full effect copy and wrapping mode.

## Verification

- `just godot-test`
- `just godot-server-client-check`
- `just godot-web-export`
