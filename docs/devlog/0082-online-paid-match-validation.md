# 0082 - Online Paid Match Validation

Date: 2026-09-17

## Goal

Capture the first successful online validation of the deployed paid-room flow.

## Result

The staging/custom-domain flow was validated from:

```text
https://www.falafel.com.br/evanopolis-v1/
```

A two-player paid room was created and both browser tabs completed:

- wallet login through deployed `tabletop-auth`
- room creation/invite lookup through deployed Rooms API
- EVA ticket payment and verification
- paid client launch
- game-server paid admission check
- successful entry into the same live match

## Notes

- The CORS issue was caused by `tabletop-auth` reading `ALLOWED_ORIGINS` from a
  GitHub Actions variable, while the secret of the same name had been edited.
- The working `tabletop-auth` `ALLOWED_ORIGINS` variable includes the custom
  domain origins:
  - `https://www.falafel.com.br`
  - `https://falafel.com.br`
- Rooms API staging was also updated to allow those origins.

## Follow-Up Candidates

- Decide how room ticket tier maps to in-game economy, if at all.
- Harden reconnect and duplicate-wallet behavior for paid rooms.
- Add richer staging smoke checks beyond `/health` and `/healthz`.
- Review whether a separate `tabletop-auth-staging` app is needed before final
  delivery.
