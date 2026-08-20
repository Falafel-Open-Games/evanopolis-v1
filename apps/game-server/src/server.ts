import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describeEvanopolisAcceptedCommand } from "./evanopolis-rules/debug-logs.js";
import { EvanopolisRulesAdapter } from "./evanopolis-rules/evanopolis-rules-adapter.js";
import { parseEvanopolisJoinConfiguration } from "./evanopolis-rules/room-options.js";
import { createMatchWebSocketServer } from "./multiplayer-core/websocket-server.js";

const DefaultPort = 8788;
const DefaultHost = "127.0.0.1";
const DefaultPlayerCount = 3;
const ShouldLogServerEvents = process.env.EVANOPOLIS_SERVER_LOGS !== "0";
const BuildVersion = readBuildVersion();

export function createHealthServer() {
  return createMatchWebSocketServer({
    service_name: "evanopolis-game-server",
    build_version: BuildVersion,
    default_player_count: DefaultPlayerCount,
    rules: new EvanopolisRulesAdapter(),
    parse_join_configuration: parseEvanopolisJoinConfiguration,
    describe_accepted_command: describeEvanopolisAcceptedCommand,
    should_log_events: ShouldLogServerEvents
  });
}

function readBuildVersion(): string {
  const environment_version = process.env.EVANOPOLIS_BUILD_VERSION?.trim();
  if (environment_version !== undefined && environment_version !== "") {
    return environment_version;
  }

  const module_dir = dirname(fileURLToPath(import.meta.url));
  const candidate_paths = [
    resolve(process.cwd(), "BUILD_VERSION"),
    resolve(process.cwd(), "../../BUILD_VERSION"),
    resolve(module_dir, "../../../BUILD_VERSION")
  ];
  for (const candidate_path of candidate_paths) {
    if (!existsSync(candidate_path)) {
      continue;
    }

    const version = readFileSync(candidate_path, "utf8").trim();
    if (version !== "") {
      return version;
    }
  }

  return "unknown";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT ?? `${DefaultPort}`, 10);
  const host = process.env.HOST ?? DefaultHost;
  const server = createHealthServer();
  server.listen(port, host, () => {
    console.log(`evanopolis-game-server listening on http://${host}:${port}`);
  });
}
