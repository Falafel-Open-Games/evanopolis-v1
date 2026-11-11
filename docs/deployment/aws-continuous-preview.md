# AWS Official Preview Continuous Deployment

The official progress environment serves the latest successfully built `main`
revision at:

- <https://play.evanopolis.evervaluecoin.com/>
- <https://play.evanopolis.evervaluecoin.com/free-entry.html>

The `Deploy AWS Preview` workflow builds the web client and waits for the Game
Server and Rooms API images carrying the same immutable `sha-<commit>` tag. It
then updates the single EC2 quick-start deployment and verifies the public URLs.
The separately versioned `tabletop-auth` image and all persistent volumes remain
untouched.

## Repository configuration

Create a GitHub environment named `aws-official-preview`. Add environment
protection if deployments should require approval, then configure these
repository or environment secrets:

| Secret | Value |
| --- | --- |
| `AWS_PREVIEW_HOST` | EC2 DNS name or Elastic IP |
| `AWS_PREVIEW_USER` | SSH user, currently `ubuntu` |
| `AWS_PREVIEW_SSH_PRIVATE_KEY` | Private key authorized by the instance |
| `AWS_PREVIEW_KNOWN_HOSTS` | Pinned SSH host-key line for the EC2 host |

Generate the known-host entry from a trusted operator machine and compare its
fingerprint with the instance before saving it:

```bash
ssh-keyscan -H ec2-host.example.com
```

Do not use `StrictHostKeyChecking=no`; an unverified host would allow the
workflow to send its deployment key to an impersonated server.

## Deployment behavior

For each push to `main`, the workflow:

1. runs wrapper and focused Godot tests;
2. exports and packages the web client with the exact Git commit recorded;
3. waits for matching immutable Rooms API and Game Server images;
4. verifies artifact checksums on EC2;
5. saves the current web directory and release variables;
6. recreates only Rooms API, Game Server, and Caddy;
7. checks auth, rooms, game, the paid entry page, and the free entry page;
8. restores the prior web directory and release configuration if activation
   fails.

Deployments are serialized so two `main` revisions cannot update EC2 at the
same time. The previous web directory remains beside the active `web` directory
as an operator-visible rollback artifact. The deploy script retains the five
newest web backups and removes uploaded revision directories older than 14 days.

## Operational limitation

Game Server state is in memory. Recreating that container ends active matches.
The official URLs are a continuous preview environment, so merges should be
scheduled with that interruption in mind. A production environment should use
a manual approval window until match persistence exists.

## Manual dispatch and diagnosis

Use **Actions → Deploy AWS Preview → Run workflow** to redeploy the current
`main` revision. The workflow refuses to mix artifacts: it will stop unless the
web manifest and both container tags match the workflow commit.

On EC2, inspect the deployment with:

```bash
cd /home/ubuntu/evanopolis-v1/deploy/aws/quickstart
docker compose ps
docker compose logs --tail=200 rooms game caddy
```

The active `.env` records `ROOMS_IMAGE`, `GAME_IMAGE`, and
`EVANOPOLIS_BUILD_VERSION`, providing a quick record of what is running.
