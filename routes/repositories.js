const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");

router.get("/", async (req, res, next) => {
  var { rows } = await db.query(
    "SELECT * FROM repositories"
  );
  res.status(200).send(rows);
});

module.exports = router;
