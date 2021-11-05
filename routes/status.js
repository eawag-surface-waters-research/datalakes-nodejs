const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");

router.get("/", async (req, res, next) => {
  res.status(200).send("Datalakes API is live.");
});

router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT id, title, maxdatetime, monitor FROM datasets WHERE monitor IS NOT NULL AND id = $1",
    [id]
  );
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  let now = new Date().getTime();
  let maxdatetime = new Date(rows[0].maxdatetime).getTime();
  if (now > maxdatetime - rows[0].monitor * 1000) {
    return next(error(400, "Dataset " + rows[0].title + " is out of date."));
  }
  res.status(200).send("Dataset " + rows[0].title + " is up to date.");
});

module.exports = router;
