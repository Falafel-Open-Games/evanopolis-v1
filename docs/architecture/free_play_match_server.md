# Free Play Match Server

This note defines the smallest useful multiplayer server for building and
testing the core Evanopolis game experience before wallet auth, rooms,
invitations, payments, referrals, and prize distribution are ready.

The goal is fast client review: open a browser URL, enter a match, and exercise
the authoritative game loop with minimal setup.

## Product Scope

The first server milestone is a free-play match server.

It should support:
- creating or loading a match from any match id
- 3-player matches with hardcoded settings
- browser clients joining quickly without wallet login
- authoritative server state and rules
- Godot clients rendering snapshots and sending intent commands
- spectators after all player seats are filled
- deterministic debug fixtures or event replay later

It should not support yet:
- wallet login
- paid entry
- configurable room size
- invitations
- matchmaking
- referrals
- prize-pool payout
- production identity
- production anti-abuse controls
- multiple cooperating backend services

## Service Shape

Start with one process:

- static client host, or a separate static host pointing at this server
- HTTP endpoint for health and basic match bootstrap
- WebSocket endpoint for live match communication
- in-memory match registry for the first iteration

The server can later be split behind rooms/auth/payment services, but v0 should
not simulate those services internally. Keep those concerns outside the match
server boundary until they are real requirements.

## Match Creation

Any match id is valid.

Examples:
- `/match/demo`
- `/match/client-review-1`
- `/match/8f3a9c`

When the first browser opens a match id, the server creates that match with the
default settings. Later browser clients opening the same match id attach to the
existing match if it is still alive.

Default settings:
- player count: `3`
- entry fee: `0 EVA`
- starting balance: hardcoded by the rules implementation
- board version: current v1 board
- rules version: current v1 rules draft
- private invitations: disabled
- wallet requirement: disabled

## Seat Assignment

The first 3 unique browser clients to join become players.

After all player seats are filled:
- additional clients join as spectators
- spectators receive the same snapshots/events
- spectators cannot submit gameplay intents

For v0, identity can be a random per-match browser token stored in local
storage. The token is not security. It only makes refresh/reconnect usable
during local and client review sessions.

## Server Authority

The server owns all authoritative state and outcomes:

- match phase
- player seats
- active turn
- dice values
- player positions
- board ownership
- terrain development
- special-property ownership
- EVA balances
- rent transfers
- purchase validation
- turn transitions
- card/jail/jackpot/endgame behavior when those rules exist

The client sends intent commands only. The server validates the command against
the current match revision and either rejects it or broadcasts the accepted
state change.

## Client Intents

Initial client-to-server commands should be small and explicit:

- `join_match`
- `request_roll`
- `request_purchase_property`
- `request_purchase_container`
- `request_purchase_machine_lot`
- `request_decline_purchase`
- `request_end_turn`

Each command should include:
- `match_id`
- `client_id`
- `player_id`, when seated
- `seen_revision`
- command-specific payload

The `seen_revision` lets the server reject stale commands cleanly.

## Server Messages

Initial server-to-client messages:

- `match_snapshot`
- `player_joined`
- `spectator_joined`
- `turn_started`
- `dice_rolled`
- `player_moved`
- `property_purchased`
- `terrain_developed`
- `rent_paid`
- `available_actions_changed`
- `turn_ended`
- `command_rejected`

The client should be able to rebuild the full render state from the latest
`match_snapshot`. Events are useful for animation and logs, but snapshots are
the recovery path.

## Persistence

Start with in-memory matches.

Add persistence only when the iteration loop needs restart safety. The first
persistence step should be simple snapshot storage, such as SQLite or JSONL
event logs, not a full production data platform.

Minimum useful persisted data later:
- match id
- current revision
- current snapshot
- event history for replay/debugging
- browser token to player seat mapping for reconnects

## Debug And Review

Free play is not a replacement for debug tooling.

Useful development tools:
- create a match from a named fixture
- load a snapshot at a specific turn
- replay an event sequence
- seed dice outcomes for deterministic review
- export a bug reproduction from a live match

These tools should be server/development features or fixture loaders, not
permanent Godot keyboard shortcuts in the production client.

## Future Integration Boundary

When rooms/auth/payment services are introduced, they should wrap match
creation instead of changing the core game loop.

Future services can provide:
- authenticated player identities
- authorized seat lists
- room settings
- entry-fee payment status
- referral metadata
- prize-pool configuration

The match server should still receive a clear match configuration and then own
the authoritative game state from match start through match end.

## First Implementation Target

The smallest useful implementation target is:

1. A server process can create an in-memory match by id.
2. Three browser clients can join as players.
3. Later clients join as spectators.
4. The active player can request a roll.
5. The server chooses dice values and moves the player.
6. The server broadcasts a new snapshot.
7. Godot renders the server snapshot.

This proves the important architecture without requiring wallet, room, or
payment systems.
