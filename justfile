default:
    just --list

# Install TypeScript game-server dependencies.
game-server-install:
    npm install --prefix apps/game-server

# Type-check and compile the TypeScript game server.
game-server-build:
    npm run build --prefix apps/game-server

# Build and run the initial TypeScript game-server HTTP process.
game-server-serve:
    npm run serve --prefix apps/game-server

# Build the game-server Docker image.
game-server-docker-build:
    docker build -f deploy/docker/game-server/Dockerfile -t evanopolis-v1-game-server .

# Deploy the staging game-server Fly app.
game-server-fly-deploy:
    flyctl deploy -c deploy/fly/game-server/fly.toml --ha=false

# Smoke-check a local or deployed game-server URL.
game-server-smoke url="http://127.0.0.1:8788":
    deploy/fly/game-server/smoke-check.sh {{url}}

# Smoke-check the staging game-server Fly app.
game-server-smoke-staging:
    deploy/fly/game-server/smoke-check.sh https://evanopolis-v1-game-server-staging.fly.dev

# Run the TypeScript game-server test suite.
game-server-test:
    npm test --prefix apps/game-server

# Run the game-server WebSocket integration test.
game-server-test-integration:
    npm run test:integration --prefix apps/game-server

# Restore Godot material tweaks that can be clobbered by GLB reimports.
restore-godot-materials:
    bash scripts/restore-godot-materials.sh

# Run the server-connected Godot scene long enough to catch script errors.
godot-server-client-check:
    godot --headless --path godot --scene res://game/bootstrap-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-bootstrap.log -- --client-scene=server-client --no-auto-join
    godot --headless --path godot --scene res://game/server-client-main.tscn --quit-after 2 --log-file /tmp/evanopolis-godot-server-client.log -- --no-auto-join

# Export the Godot Web build used by the web wrapper.
godot-web-export:
    godot --headless --path godot --export-release Web ../apps/web-wrapper/game/index.html --quit --log-file /tmp/evanopolis-godot-export-wrapper.log

# Serve the static web wrapper review page.
serve-web-wrapper:
    python3 -m http.server 4173

# Sync the review wrapper version label to the current jj change id.
sync-review-version:
    bash scripts/sync-review-version.sh
