# Evanopolis V1 — Advanced AWS Production Setup

This tutorial deploys Evanopolis using the AWS Console. Use one AWS Region for
everything except the website certificate, which must be created in
`us-east-1` for CloudFront.

See the [architecture overview](../architecture/architecture-overview.md) for
the logical services, trust boundaries, and quick-start deployment diagram.

## Before you start

Start with the existing `v1.0.0-rc.2` artifacts:

- [ ] [RC.2 GitHub release](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/tag/untagged-a48422f08931c2ef0657)
- [ ] [Release manifest](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/download/untagged-a48422f08931c2ef0657/release-manifest.yaml)
- [ ] [Web archive](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/download/untagged-a48422f08931c2ef0657/evanopolis-v1-web-v1.0.0-rc.2.tar.gz)
- [ ] [SHA-256 checksums](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/download/untagged-a48422f08931c2ef0657/SHA256SUMS)
- [ ] [Game Server container package](https://github.com/orgs/Falafel-Open-Games/packages/container/package/evanopolis-v1-game-server)
- [ ] [Rooms API container package](https://github.com/orgs/Falafel-Open-Games/packages/container/package/evanopolis-v1-rooms-api)
- [ ] [`tabletop-auth` container package](https://github.com/orgs/Falafel-Open-Games/packages/container/package/tabletop-auth)

The release manifest contains the exact image tags and digests. Never use a
`latest` tag. The release is currently a **draft**. The deployment engineer is
already a member of both the `evanopolis-v1` and `tabletop-auth` repositories,
so no public release or public container packages are required. Before the
meeting, confirm that their GitHub account can open the RC.2 link above and all
three container-package links.

These production-specific items are not supplied by the release. Get them from
Falafel before deployment and **stop if anything is missing**:

- [ ] Exact `tabletop-auth` environment-variable list for the pinned revision
- [ ] Chain ID, RPC URL, payment contract addresses, and confirmation count
- [ ] Web archive built for the final production URLs and payment contracts

Choose these names and replace the examples throughout this tutorial:

```text
AWS Region: us-east-1
Website:    play.example.com
Rooms API:  rooms.example.com
Auth API:   auth.example.com
Game API:   game.example.com
```

## What you will create

- ECS Fargate: one container each for Game Server, Rooms API, and
  `tabletop-auth`
- One Application Load Balancer for the three containers
- RDS PostgreSQL for auth and payment records
- ElastiCache Redis/Valkey for auth nonces and locks
- EFS for `/data/rooms.json`
- S3 and CloudFront for the website
- Route 53 records and ACM certificates for HTTPS

The Rooms API and Game Server must each stay at **one running task**.

## 1. Create the network

Open **VPC → Create VPC → VPC and more**.

Use:

```text
Name: evanopolis
Availability Zones: 2
Public subnets: 2
Private subnets: 2
NAT gateways: 1
VPC endpoints: None
```

Create these security groups in the new VPC:

| Name | Inbound rule |
| --- | --- |
| `evanopolis-alb` | HTTPS 443 from `0.0.0.0/0` |
| `evanopolis-ecs` | TCP 3000, 3001, and 8788 from `evanopolis-alb` |
| `evanopolis-postgres` | PostgreSQL 5432 from `evanopolis-ecs` |
| `evanopolis-redis` | TCP 6379 from `evanopolis-ecs` |
| `evanopolis-efs` | NFS 2049 from `evanopolis-ecs` |

Do not make PostgreSQL, Redis, EFS, or ECS container ports public.

## 2. Create PostgreSQL

Open **RDS → Databases → Create database**.

Choose:

```text
Creation method: Standard create
Engine: PostgreSQL
Engine version: 16.x
Template: Production
DB instance identifier: evanopolis-postgres
Credentials management: Managed in AWS Secrets Manager
VPC: evanopolis
Public access: No
Security group: evanopolis-postgres
Initial database name: evanopolis
Backups: Enabled
```

Create the database and save its endpoint and generated secret. Build the
`DATABASE_URL` in the exact format required by the pinned `tabletop-auth`
`.env.example`; do not guess its TLS parameters.

## 3. Create Redis/Valkey

Open **ElastiCache → Valkey caches → Create**.

Choose a serverless cache in the `evanopolis` VPC, named
`evanopolis-nonces`. Select the two private subnets and the
`evanopolis-redis` security group. Enable encryption in transit.

Save the endpoint and credentials. Build `NONCE_STORE_URL` exactly as required
by the pinned `tabletop-auth` `.env.example`.

## 4. Create the Rooms API volume

Open **EFS → Create file system**.

```text
Name: evanopolis-rooms
VPC: evanopolis
Mount targets: both private subnets
Security group: evanopolis-efs
```

Open the file system and create an access point:

```text
Name: rooms-data
Root directory: /rooms
POSIX user UID/GID: 1000 / 1000
Root owner UID/GID: 1000 / 1000
Permissions: 0755
```

Save the file-system ID and access-point ID.

## 5. Put the container images in ECR

Create three private ECR repositories:

```text
evanopolis/game-server
evanopolis/rooms-api
evanopolis/tabletop-auth
```

For each release image:

1. Pull the exact image from the release manifest by digest.
2. Tag it for the matching ECR repository.
3. Push it to ECR.
4. Record the resulting ECR image URI and digest.

Do not rebuild the images and do not substitute a different tag. If the source
registry is private, ask Falafel for read credentials.

## 6. Store secrets

Open **Secrets Manager → Store a new secret → Other type of secret**. Create
one secret per sensitive value used by `tabletop-auth`, including:

```text
JWT_PRIVATE_KEY_PEM
JWT_PUBLIC_KEY_PEM
DATABASE_URL
NONCE_STORE_URL
EVM_RPC_URL
```

Add any other secret required by the pinned auth `.env.example`. Never paste
these values directly into an ECS task definition as plain environment values.

## 7. Create the load balancer

In ACM in your chosen AWS Region, request a public certificate covering:

```text
rooms.example.com
auth.example.com
game.example.com
```

Validate it through DNS.

Open **EC2 → Load Balancers → Create → Application Load Balancer**.

```text
Name: evanopolis
Scheme: Internet-facing
Subnets: both public subnets
Security group: evanopolis-alb
Listener: HTTPS 443
Certificate: the certificate created above
```

Create three target groups. For all three, choose **IP addresses** as the target
type and do not register targets manually:

| Target group | Port | Health-check path |
| --- | ---: | --- |
| `evanopolis-auth` | 3000 | `/health` |
| `evanopolis-rooms` | 3001 | `/healthz` |
| `evanopolis-game` | 8788 | `/health` |

Add HTTPS listener rules:

```text
Host is auth.example.com  → evanopolis-auth
Host is rooms.example.com → evanopolis-rooms
Host is game.example.com  → evanopolis-game
```

The Application Load Balancer handles the Game Server's `/match` WebSocket
connection automatically; the health check itself uses `/health`, not
WebSocket.

## 8. Create the ECS cluster and roles

Open **ECS → Clusters → Create cluster**.

```text
Name: evanopolis
Infrastructure: AWS Fargate
```

Create or select an ECS task execution role with:

- `AmazonECSTaskExecutionRolePolicy`
- permission to read the Secrets Manager secrets created above

Enable CloudWatch logging in every task definition.

## 9. Deploy `tabletop-auth`

Open **ECS → Task definitions → Create new task definition**.

```text
Family: evanopolis-auth
Launch type: AWS Fargate
Operating system/architecture: Linux/X86_64
Task size: start with 0.5 vCPU and 1 GB memory
Container image: exact ECR auth image from step 5
Container port: 3000
```

Add the non-secret values below, replacing every placeholder with an approved
value:

```dotenv
PORT=3000
JWT_KEY_ID=<approved key id>
JWT_ACCESS_TOKEN_TTL_SECONDS=900
ALLOWED_ORIGINS=https://play.example.com
CHAIN_ID=<approved chain ID>
CHAIN_IDS=<approved chain ID/list>
PAYMENT_MIN_CONFIRMATIONS=<approved value>
PAYMENT_ADAPTER_ADDRESS=<approved address>
ALLOW_EXPIRED_JWT=
```

Add `JWT_PRIVATE_KEY_PEM`, `JWT_PUBLIC_KEY_PEM`, `DATABASE_URL`,
`NONCE_STORE_URL`, and `EVM_RPC_URL` from Secrets Manager. Add every other
variable required by the pinned auth `.env.example`.

Create an ECS service:

```text
Service name: evanopolis-auth
Desired tasks: 1
Networking: private subnets; evanopolis-ecs security group
Public IP: Off
Load balancer target group: evanopolis-auth
Health check grace period: 60 seconds
```

Wait until the task is running and its target is healthy.

## 10. Deploy the Rooms API

Create another Fargate task definition:

```text
Family: evanopolis-rooms
Architecture: Linux/X86_64
Task size: start with 0.25 vCPU and 0.5 GB memory
Container image: exact ECR Rooms API image from step 5
Container port: 3001
```

Environment:

```dotenv
HOST=0.0.0.0
PORT=3001
AUTH_BASE_URL=https://auth.example.com
AUTH_VERIFY_PATH=/whoami
ALLOWED_ORIGINS=https://play.example.com
ROOMS_DATA_FILE=/data/rooms.json
ROOMS_API_VERBOSE_LOGS=0
```

Under **Volumes**, add the EFS file system and access point from step 4 with
transit encryption enabled. Mount it in the container at `/data`.

Create its ECS service exactly like auth, but use:

```text
Service name: evanopolis-rooms
Desired tasks: 1
Target group: evanopolis-rooms
```

Wait until the task is running and healthy. Never increase Desired tasks above
1; the JSON data file supports one writer only.

## 11. Deploy the Game Server

Create the final Fargate task definition:

```text
Family: evanopolis-game
Architecture: Linux/X86_64
Task size: start with 0.5 vCPU and 1 GB memory
Container image: exact ECR Game Server image from step 5
Container port: 8788
```

Environment:

```dotenv
HOST=0.0.0.0
PORT=8788
EVANOPOLIS_ROOMS_API_URL=https://rooms.example.com
EVANOPOLIS_AUTH_API_URL=https://auth.example.com
EVANOPOLIS_BUILD_VERSION=<release manifest build_version>
EVANOPOLIS_SERVER_LOGS=1
EVANOPOLIS_ALLOW_CLIENT_RANDOM_SEED=0
```

Create its ECS service:

```text
Service name: evanopolis-game
Desired tasks: 1
Target group: evanopolis-game
```

Wait until it is healthy. Never increase Desired tasks above 1; live matches
are stored in this one process's memory.

## 12. Create DNS for the servers

In Route 53, create an **A/AAAA Alias** record for each server hostname. Point
all three records to the Application Load Balancer:

```text
auth.example.com
rooms.example.com
game.example.com
```

These checks must all succeed before continuing:

```bash
curl -fsS https://auth.example.com/health
curl -fsS https://rooms.example.com/healthz
curl -fsS https://game.example.com/health
```

The Rooms response must include `{"ok":true}`. The Game response must contain
the release manifest's build version.

## 13. Deploy the website

Verify the supplied archive before uploading it:

```bash
sha256sum -c SHA256SUMS
```

Create a private S3 bucket named for the website. Leave **Block all public
access** enabled. Extract the archive locally, then upload the extracted files
to the bucket root. `room-entry.html` and the `game/` directory must be at the
root—not inside another version directory.

In ACM, switch to **US East (N. Virginia), `us-east-1`** and request a public
certificate for `play.example.com`.

Create a CloudFront distribution:

```text
Origin: the S3 bucket (not its website endpoint)
Origin access: Origin access control (recommended)
Viewer protocol policy: Redirect HTTP to HTTPS
Allowed methods: GET, HEAD
Default root object: room-entry.html
Alternate domain: play.example.com
Certificate: play.example.com certificate from us-east-1
```

Accept the suggested S3 bucket-policy update that grants CloudFront read
access. Create a Route 53 A/AAAA Alias for `play.example.com` pointing to the
CloudFront distribution.

## 14. Final test

Open `https://play.example.com` using two wallets in two browser sessions:

- [ ] Wallet 1 creates a paid room.
- [ ] The invitation opens in session 2 on `play.example.com`.
- [ ] Both wallets pay and verify their seats.
- [ ] Both players enter the same match.
- [ ] One player refreshes and reconnects.
- [ ] Browser console and CloudWatch logs show no CORS, WebSocket, RPC,
      payment, or admission errors.

Do not announce the deployment until every box passes.

## Backups and updates

- Enable RDS automated backups and EFS backups.
- A Game Server restart ends active matches; update it when nobody is playing.
- Update in this order: auth, Rooms API, Game Server, website.
- Keep the previous task-definition revisions and web archive for rollback.
- Never log JWTs, wallet signatures, private keys, database/Redis URLs, or
  credential-bearing RPC URLs.

Full application reference:
[`../delivery/operator-handoff.md`](../delivery/operator-handoff.md).
