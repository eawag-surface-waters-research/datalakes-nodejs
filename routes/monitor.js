const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const db = require("../db");

router.get("/", async (req, res, next) => {
  var { rows } = await db.query(
    "SELECT id, title, maxdatetime, monitor FROM datasets WHERE monitor IS NOT NULL"
  );
  res.status(200).send(rows);
});

module.exports = router;