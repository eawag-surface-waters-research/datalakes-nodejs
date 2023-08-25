const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const { isInt, error } = require("../functions");

router.get("/", async (req, res, next) => {
  if ((req.query.datasets_id, req.query.parameters_id)) {
    var datasets_id = req.query.datasets_id;
    var parameters_id = req.query.parameters_id;
    if (!isInt(datasets_id)) {
      return next(error(400, "ID must be an integer"));
    }
    if (!isInt(parameters_id)) {
      return next(error(400, "ID must be an integer"));
    }
    var {
      rows,
    } = await db.query(
      "SELECT * FROM datasetparameters WHERE datasets_id = $1 AND parameters_id = $2",
      [datasets_id, parameters_id]
    );
    if (rows.length < 1) {
      return next(error(404, "Dataset not found in database"));
    }
    res.status(200).send(rows[0]);
  } else if (req.query.datasets_id) {
    var id = req.query.datasets_id;
    if (!isInt(id)) {
      return next(error(400, "ID must be an integer"));
    }
    var {
      rows,
    } = await db.query(
      "SELECT * FROM datasetparameters WHERE datasets_id = $1",
      [id]
    );
    if (rows.length < 1) {
      return next(error(404, "Dataset not found in database"));
    }
    res.status(200).send(rows);
  } else {
    var { rows } = await db.query("SELECT * FROM datasetparameters");
    res.status(200).send(rows);
  }
});

/**
 * @swagger
 * /datasetparameters/{dataset_id}:
 *  get:
 *    tags: 
 *       ['Dataset Parameters']
 *    description: Get parameters of specific dataset based on id
 *    parameters:
 *       - in: path
 *         name: dataset_id   # Note the name is the same as in the path
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The dataset ID.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:datasets_id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT * FROM datasetparameters WHERE datasets_id = $1",
    [id]
  );
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send(rows);
});

router.post("/", async (req, res, next) => {
  var { id, datasetparameters } = req.body;
  // Remove old parameters
  await db.query("DELETE FROM datasetparameters WHERE datasets_id = $1", [id]);

  // Add new parameters
  var query;
  var pid = [];
  for (var i = 0; i < datasetparameters.length; i++) {
    var parameter = datasetparameters[i];
    if (parameter.included) {
      query =
        "INSERT INTO datasetparameters (datasets_id,parameters_id,unit,sensors_id,axis,parseparameter,detail) VALUES ($1, $2, $3, $4, $5, $6,$7) RETURNING *";
      var { rows } = await db.query(query, [
        id,
        parameter.parameters_id,
        parameter.unit,
        parameter.sensors_id,
        parameter.rAxis,
        parameter.parseparameter,
        parameter.detail,
      ]);
      parameter["new_id"] = rows[0].id;
    }
  }
  for (var j = 0; j < datasetparameters.length; j++) {
    var parameter = datasetparameters[j];
    if (parameter.included) {
      var link = parseInt(parameter.link);
      if (isInt(link) && link > -1 && link < datasetparameters.length) {
        var link_param = datasetparameters.find((dp) => (dp.id === link));
        await db.query("UPDATE datasetparameters SET link = $1 WHERE id = $2", [
          link_param.new_id,
          parameter.new_id,
        ]);
      }
    }
  }
  res.status(200).send("Added to database");
});

router.delete("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var {
    rowCount,
  } = await db.query("DELETE FROM datasetparameters WHERE id = $1", [id]);
  if (rowCount < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(201).send();
});

module.exports = router;
