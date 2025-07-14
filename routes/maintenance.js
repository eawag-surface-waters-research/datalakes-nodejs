const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");

router.post("/", async (req, res, next) => {
  var { id, start, end, parameters, description, reporter, sensordepths, datasetparameters, state, issue } =
    req.body;

  // Verify inputs
  start = new Date(start);
  end = new Date(end);

  for (let i = 0; i < parameters.length; i++) {
    var query =
      "INSERT INTO maintenance (datasets_id, parameters_id, starttime, endtime, depths, description, reporter, datasetparameters_id, state, issue) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)";
    await db.query(query, [
      id,
      parameters[i],
      start,
      end,
      sensordepths,
      description,
      reporter,
      datasetparameters[i],
      state || "reported",
      issue
    ]);
  }
  res.status(200).send("Added maintenance event to database.");
});

router.get("/:datasets_id", async (req, res, next) => {
  var datasets_id = req.params.datasets_id;
  if (!isInt(datasets_id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT m.id, m.starttime, m.endtime, m.depths, p.name, dp.parseparameter, dp.detail, m.description, m.reporter, m.datasetparameters_id, m.state, m.issue FROM maintenance m INNER JOIN datasetparameters dp ON m.datasetparameters_id = dp.id AND m.parameters_id = dp.parameters_id INNER JOIN parameters p ON p.id = m.parameters_id WHERE m.datasets_id = $1",
    [datasets_id]
  );
  res.status(200).send(rows);
});

router.put("/:id/state", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { state } = req.body;
  if (!state || !["reported", "confirmed", "resolved"].includes(state)) {
    return next(error(400, "State must be one of: reported, confirmed, resolved"));
  }
  await db.query(
    "UPDATE maintenance SET state = $1 WHERE id = $2",
    [state, id]
  );
  res.status(200).send();
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
