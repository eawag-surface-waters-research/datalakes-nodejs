const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");

router.post("/", async (req, res, next) => {
  var { id, start, end, parameters, description, reporter, sensordepths } =
    req.body;

  // Verify inputs
  start = new Date(start);
  end = new Date(end);

  for (let i = 0; i < parameters.length; i++) {
    var query =
      "INSERT INTO maintenance (datasets_id, parameters_id, starttime, endtime, depths, description, reporter) VALUES ($1, $2, $3, $4, $5, $6, $7)";
    await db.query(query, [
      id,
      parameters[i],
      start,
      end,
      sensordepths,
      description,
      reporter,
    ]);
  }
  res.status(200).send("Added maintenance event to database.");
});

router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT * FROM maintenance m INNER JOIN datasetparameters dp ON m.datasets_id = dp.datasets_id AND m.parameters_id = dp.parameters_id WHERE m.datasets_id = $1",
    [id]
  );
  res.status(200).send(rows);
});

router.delete("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  await db.query("DELETE FROM maintenance WHERE id = $1", [id]);
  res.status(200).send("");
});

module.exports = router;
