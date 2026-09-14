import { loadConfig } from "./config.js";
import { createRoomsApiServer } from "./server.js";

const config = loadConfig();
const server = await createRoomsApiServer(config);

server.listen(config.port, config.host, () => {
  console.log(`evanopolis-rooms-api listening on http://${config.host}:${config.port}`);
});
