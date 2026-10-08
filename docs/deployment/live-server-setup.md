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
- Browser access to the private `tabletop-auth` repository

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
sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker "$USER"
exit
```

SSH into the server again so the Docker permission takes effect.

## 3. Clone the deployment files

Clone the public repository:

```bash
git clone https://github.com/Falafel-Open-Games/evanopolis-v1.git
cd evanopolis-v1/deploy/aws/quickstart
```

## 4. Copy the release files from your computer

On your local computer, download these two files in your web browser:

- [`evanopolis-v1-web-v1.0.0-rc.2.tar.gz`](https://github.com/Falafel-Open-Games/evanopolis-v1/releases/download/untagged-a48422f08931c2ef0657/evanopolis-v1-web-v1.0.0-rc.2.tar.gz)
- [`tabletop-auth-rc2.tar.gz`](https://github.com/Falafel-Open-Games/tabletop-auth/releases/download/evanopolis-v1-rc.2/tabletop-auth-rc2.tar.gz)

GitHub may ask you to sign in because the web release is still a draft and the
`tabletop-auth` repository is private.

From your local repository root, copy it to EC2:

```bash
scp -i .secrets/evanopolis.pem \
  ~/Downloads/evanopolis-v1-web-v1.0.0-rc.2.tar.gz \
  ~/Downloads/tabletop-auth-rc2.tar.gz \
  ubuntu@YOUR_EC2_HOST:/home/ubuntu/evanopolis-v1/deploy/aws/quickstart/
```

Back in the EC2 SSH session, load the private image:

```bash
gzip -dc tabletop-auth-rc2.tar.gz | docker load
```

The Game Server and Rooms API images are public and will be pulled automatically.

## 5. Configure it

Create the configuration file:

```bash
cp .env.example .env
nano .env
```

Replace every value marked `CHANGE_ME`. Use the real four domain names and the
RPC URL supplied for this deployment. Save with **Ctrl+O**, **Enter**, then
exit with **Ctrl+X**.

## 6. Start it

Run:

```bash
./start.sh
```

The script extracts the copied RC.2 web client, updates it to use your four
domain names, pulls the public containers, and starts everything. Caddy obtains
the HTTPS certificates automatically.

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
