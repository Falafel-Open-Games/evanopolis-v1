# Evanopolis V1 — Five-Minute AWS Server Setup

This is the fast path: one Ubuntu EC2 server running every backend with Docker
Compose. It is suitable for getting the release candidate online quickly.

See the [architecture overview](../architecture/architecture-overview.md) for
the component, paid-entry, and EC2 deployment diagrams.

For a fault-tolerant AWS setup with ECS, RDS, ElastiCache, EFS, and CloudFront,
use the [advanced AWS guide](aws-production-advanced.md) instead.

## You need

- An AWS account
- A domain with four names pointed at the EC2 server:

```text
play.example.com
auth.example.com
rooms.example.com
game.example.com
```

- The production RPC URL and an API key
- GitHub access to the private `tabletop-auth` repository and container package

The script uses the existing
[RC.2 web download](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/download/untagged-a48422f08931c2ef0657/evanopolis-v1-web-v1.0.0-rc.2.tar.gz)
and the three pinned RC.2 Docker images. The Game Server and Rooms API are
public. Only the `tabletop-auth` source and container are private. You do not
need the release manifest or checksum files for this quick setup.

## 1. Create the server

In AWS, open **EC2 → Launch instance**.

```text
Name: evanopolis
Image: Ubuntu Server 24.04 LTS
Size: t3.large
Disk: 40 GB gp3
```

Allow inbound TCP ports **22**, **80**, and **443**. Allocate an Elastic IP and
attach it to this instance.

Create DNS `A` records for the four names above, all pointing to that Elastic
IP. Wait until the names resolve before continuing.

## 2. Connect and install Docker

SSH into the server, then run:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 gh
sudo usermod -aG docker "$USER"
exit
```

SSH into the server again so the Docker permission takes effect.

## 3. Download the deployment files

Clone the public repository:

```bash
git clone https://github.com/Falafel-Open-Games/evanopolis-v1.git
cd evanopolis-v1/deploy/aws/quickstart
```

Log in only for the private `tabletop-auth` image and the still-draft RC.2 web
download:

```bash
gh auth login
gh auth refresh -s read:packages
gh auth token | docker login ghcr.io -u "$(gh api user --jq .login)" --password-stdin
```

The public Game Server and Rooms API images do not require this login. If the
RC.2 release is published later, only the private `tabletop-auth` pull will
still require it.

## 4. Configure it

Create the configuration file:

```bash
cp .env.example .env
nano .env
```

Replace every value marked `CHANGE_ME`. Use the real four domain names and the
RPC URL supplied for this deployment. Save with **Ctrl+O**, **Enter**, then
exit with **Ctrl+X**.

## 5. Start it

Run:

```bash
./start.sh
```

The script downloads the RC.2 web client, updates it to use your four domain
names, pulls the pinned containers, and starts everything. Caddy obtains the
HTTPS certificates automatically.

When it finishes, open:

```text
https://play.example.com
```

## Check that it worked

Run:

```bash
curl -fsS https://auth.example.com/health
curl -fsS https://rooms.example.com/healthz
curl -fsS https://game.example.com/health
docker compose ps
```

All containers must say `Up`. The three `curl` commands must succeed.

Then create a room with one wallet and join it from a second browser using a
second wallet. If that works, the deployment is ready for acceptance testing.

## Useful commands

```bash
# View logs
docker compose logs -f

# Restart everything
docker compose restart

# Stop everything without deleting data
docker compose down

# Start it again
docker compose up -d
```

Do not run `docker compose down -v`: `-v` deletes the database and room data.
