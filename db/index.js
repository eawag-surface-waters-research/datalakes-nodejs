const { Pool } = require("pg");
const creds = require("../config");

const pool = new Pool({
  user: creds.db_user,
  host: creds.db_host,
  database: creds.db_database,
  password: creds.db_password,
  port: creds.db_port
});

module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  },
}