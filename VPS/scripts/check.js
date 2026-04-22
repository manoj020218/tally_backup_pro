const { spawnSync } = require("node:child_process");

const files = [
  "src/server.js",
  "src/app.js",
  "src/config.js",
  "src/db.js",
  "src/errors.js",
  "src/licenseKey.js",
  "src/licenseRepository.js",
  "src/licenseService.js",
  "src/adminService.js",
  "src/token.js",
  "src/validators.js"
];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Syntax check passed for ${files.length} files.`);

