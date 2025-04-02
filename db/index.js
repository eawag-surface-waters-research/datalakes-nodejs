const { Pool } = require("pg");
const creds = require("../config");

const pool = new Pool({
  host: process.env.DB_HOST || creds.db_host,
  user: process.env.DB_USER || creds.db_user,
  password: process.env.DB_PASSWORD || creds.db_password,
  database: process.env.DB_DATABASE || creds.db_database,
  port: process.env.DB_PORT || creds.db_port
});

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  },
}