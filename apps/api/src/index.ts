import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await createApp(config);

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
