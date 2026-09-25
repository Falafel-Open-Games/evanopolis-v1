# 0100-b - Mobile game launch

Status: fullscreen/landscape launch and the reported mobile controls have been
validated on a physical phone; card-resolution panels remain to be exercised.

## Goal

Make paid and free games enter their intended mobile presentation from an
explicit user gesture: fullscreen, landscape when supported, and focused game
input.

## Findings

The paid and free clients previously revealed their iframes automatically after
loading. They filled the browser viewport but never requested browser fullscreen, never
requested a landscape orientation lock, and never explicitly focused the game
iframe. Browsers require fullscreen to be requested from a user activation, so
the automatic launch could not provide the requested behavior.

The Godot `ROLL` control is a standard `Button` connected through its `pressed`
signal. No confirmed server, action-state, or button-specific cause for the
reported touch failure has been found. The same button worked on the affected
phone in a subsequent test without a deployment between attempts. This slice
therefore does not add a speculative second input path.

## Change

- Keep the paid or free game iframe hidden while its content loads.
- Present a single `Launch game` action once the game is available.
- From that user gesture, request document fullscreen and then request a
  landscape orientation lock when the browser exposes those APIs.
- Reveal and focus the iframe after the requests.
- Fall back to an instruction to rotate the device when fullscreen or
  orientation locking is unavailable or rejected.
- Hide the launch step if authentication recovery becomes necessary.

## Validation

The paid- and free-client unit tests cover the launch gate and verify that the launch
gesture requests fullscreen, requests `landscape`, reveals the game, and
focuses its iframe. Broader cross-browser validation remains useful because
fullscreen and orientation support varies across mobile browsers.

Physical-device testing through the local HTTPS tunnel confirmed fullscreen
and landscape behavior in free play. Roll, Pass, Players, Portfolio, event-log,
music, and property-panel increment controls all responded to touch. The first
test found that tapping a property card inside Portfolio did not select it.

Portfolio rows previously implemented selection through `gui_input` on a
custom `PanelContainer` inside a `ScrollContainer`. The row now carries a
transparent native `Button` across its complete bounds, matching the input path
of the controls already proven on the device. A Godot test verifies that this
button covers the full row and triggers deferred selection without freeing the
row during its signal. A regenerated web export was then tested on the same
phone: property-card selection, deselection, and the resulting development
action worked.

## Follow-up

- Exercise the Destiny/Luck card-resolution panels on the phone.
- If touch fails again, capture whether other Godot buttons respond and whether
  a `request_roll` command reaches the WebSocket before changing input code.
