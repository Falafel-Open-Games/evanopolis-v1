# Evanopolis Entry Router

This Cloudflare Worker publishes the existing GitHub Pages wrapper at one
project-owned hostname:

- `https://evanopolis.falafel.com.br/` opens the paid room flow;
- `https://evanopolis.falafel.com.br/free` opens the free room flow.

Other paths pass through unchanged so scripts, styles, game exports, invite
URLs, and the dedicated paid/free game shells remain on the same origin.

## Validate

From the repository root:

```bash
node --test deploy/cloudflare/entry-router/test/index.test.mjs
```

## Activate

The `falafel.com.br` zone must be active in the Cloudflare account used by
Wrangler. Authenticate an account with permission to edit Workers and routes,
then run:

```bash
npx wrangler deploy --config deploy/cloudflare/entry-router/wrangler.toml
```

The custom-domain declaration creates the DNS record and TLS certificate. Do
not create a separate CNAME for `evanopolis.falafel.com.br`; Cloudflare rejects
a Worker custom domain when that hostname already has a conflicting CNAME.

The paid origin is already present in the Rooms API allowlist. Before the
public smoke test, confirm that the deployed `tabletop-auth` GitHub Actions
variable `ALLOWED_ORIGINS` also contains:

```text
https://evanopolis.falafel.com.br
```

## Smoke Test

After Cloudflare reports the custom domain as active:

```bash
curl -fsSI https://evanopolis.falafel.com.br/
curl -fsSI https://evanopolis.falafel.com.br/free
```

Then create one paid invitation and one free invitation in a browser. Confirm
that copied invitation URLs retain the `evanopolis.falafel.com.br` hostname and
that both game clients open successfully.
