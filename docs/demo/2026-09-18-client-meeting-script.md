# September 18 Client Meeting Script

Use this as a live agenda and decision sheet. Allow 45 minutes; the first
15 minutes belong to the person who can settle game rules. If that person has
less time, ask questions 1–3 before opening the game. Record a named approver
and an explicit answer for each decision. “We will decide later” is an outcome,
not approval to implement a guess.

## 0:00–0:02 — Open With The Decision Block

Suggested opening:

> Last time we got useful gameplay feedback, but ran out of time for the rule
> decisions. Could we use the first 15 minutes for those while everyone who
> can approve them is here? I will read back each answer before we move on.

Ask how long the rules stakeholder can stay. Share this decision list on
screen. Assign one person to take notes while another runs the demo.

## 0:02–0:17 — Rules Decisions, In Priority Order

1. **Economy at a 10 EVA ticket (highest priority).** “What should the default
   economy setting be for a 10 EVA room: current prices, half prices, one-third
   prices, or another ratio? Should the room creator choose a preset or a custom
   number? Should the same ratio apply to property prices, development, rent,
   fines, and card amounts? What rounding precision should players see?”
   Capture the default, allowed choices, affected amounts, and rounding.
2. **Insolvency and asset transfer.** “Before elimination, which assets can a
   player mortgage or liquidate, and for how much? What happens to installed
   developments? If rent still cannot be paid, do all remaining assets transfer
   to the creditor? If a card causes elimination, do they all return to the
   bank?” Capture the order of operations and any exceptions.
3. **Jail edge cases.** Read back the feedback: doubles or 1 EVA releases a
   player; otherwise jail lasts two rounds. “Can a jailed player try doubles
   on both turns? Does a successful doubles roll also move the pawn? When can
   they choose the 1 EVA payment? After the second failed round, are they
   released automatically, and do they move that turn?” Capture the exact turn
   sequence. The current build's one-turn behavior is provisional.
4. **Special-property effects.** “Should Workshop and Cooling Plant add rent
   only in their own city, as the written rule suggests, or to all terrain
   owned by their owner, as the current demo does? Does development require
   importer ownership? Are the current importer commissions and substation
   stacking correct?” Capture a separate yes/no answer for each effect.
5. **Turn timer.** “What duration options should a room creator get? Does the
   timer pause during required card or other decisions? On expiry, should the
   game decline optional purchases and development automatically?” Capture
   timeout behavior for each pending action.
6. **Prize economy and content.** “For V1, must the jackpot be playable, or is
   tracking the pool and free rolls sufficient? Should players see the bank's
   10/30/10/50 jackpot/referrals/burn/final-prize split? Who will provide the
   final Luck/Destiny card list and prize distribution rules, and by when?”

After each answer, repeat it in one sentence: “I recorded **[rule]**. Is that
correct?” Mark anything still open with its owner and decision date.

## 0:17–0:35 — Guided Gameplay And Feedback Review

Use two browser players in the paid room flow. Keep the order flexible if dice
results make a space hard to reach.

1. **Create, invite, pay, join (5 min).** Create a room, open the invite with a
   second wallet, complete both ticket payments, and launch into the same match.
   Ask: “Is this the expected path for a paying player? Where is the wording
   unclear?” If reconnect is ready, refresh one admitted player and show it.
2. **Shared state (4 min).** Show turns, purchases or rent, and the player
   balance roster. Ask whether the amount and location of opponent information
   support decisions without crowding the board.
3. **Cards and notifications (5 min).** Show a card draw and the observer view.
   Show shared card visibility and use the lower-left arrows to replay a recent
   toast. Ask: “Which events must remain visible until acknowledged, and which can be brief
   notifications?” Record whether all players should see full card text before
   the effect resolves, after it resolves, or both.
4. **Visual/audio polish (4 min).** Show the English board labels if merged.
   Review music and sound only if actually present in the build. Ask for one
   concrete priority among music, dice, pawn movement, and panel sounds.

Call out provisional or missing features plainly. Do not describe the revised
jail rule, timer, scaling, liquidation, or final cards as implemented unless
they are working in the build being shown.

## 0:35–0:45 — Close With Commitments

Read back three lists:

- **Approved rules:** exact decisions and approver.
- **Open decisions:** owner and date for each answer or source asset.
- **Next delivery slices:** what the team will build next, in priority order.

Ask: “Did we miss a rule that would prevent you from approving the final game?”
Then confirm who will send the final card list, jackpot/prize rules, and any
approved audio assets.

## Decision Log To Fill In Live

| Topic | Decision / exact value | Approved by | Follow-up owner and date |
| --- | --- | --- | --- |
| 10 EVA default multiplier and rounding | | | |
| Assets, liquidation value, transfer on rent debt | | | |
| Card-caused elimination | | | |
| Jail release and movement sequence | | | |
| Workshop/Cooling scope | | | |
| Importer gating, commission, substation stacking | | | |
| Timer duration and pending-action expiry | | | |
| Jackpot, distribution visibility, final prize | | | |
| Final card list and delivery date | | | |
| Critical notification behavior | | | |

## Before The Call

- Confirm the exact deployed build and mark which planned slices landed.
- Open both paid-player browser sessions and keep a tested fallback room ready.
- Have the September 14 feedback notes and this decision log visible.
- Test wallet, room, payment, join, and gameplay on the presentation machine.
