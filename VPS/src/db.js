const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const sqlPath = path.join(__dirname, "..", "sql", "init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
}

async function checkDbHealth() {
  await pool.query("SELECT 1");
}

async function closeDb() {
  await pool.end();
}

module.exports = {
  pool,
  runMigrations,
  checkDbHealth,
  closeDb
};

