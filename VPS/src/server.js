const app = require("./app");
const config = require("./config");
const { runMigrations, closeDb } = require("./db");

let server;

async function start() {
  if (config.autoMigrate) {
    await runMigrations();
  }

  server = app.listen(config.port, () => {
    console.log(`License API listening on port ${config.port}`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error("Shutdown failed:", error);
    process.exit(1);
  });
});

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

