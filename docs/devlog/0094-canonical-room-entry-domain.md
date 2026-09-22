# 0094 - Canonical Room Entry Domain

Date: 2026-09-22

## Decision

Use `https://evanopolis.falafel.com.br` as the short, memorable public entry
address for Evanopolis. The subdomain root should open `room-entry.html`
directly.

## Repository Preparation

- Add the new origin to the Rooms API staging CORS allowlist.
- Document the DNS, TLS, root routing, and `tabletop-auth` CORS work needed to
  publish the address.
- Keep the existing path-based address available until the subdomain is live.

## External Activation

The DNS/TLS or reverse-proxy owner must route the subdomain to the published web
wrapper. The deployed `tabletop-auth` `ALLOWED_ORIGINS` variable must include
the new origin before that service is redeployed.
