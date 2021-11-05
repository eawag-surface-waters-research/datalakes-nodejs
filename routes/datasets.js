const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const {
  isInt,
  dataTypeVerification,
  unix2psqltime,
  error,
} = require("../functions");

/**
 * @swagger
 * /datasets:
 *  get:
 *    tags:
 *       ['Datasets']
 *    description: List of all datasets in the Datalakes database
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/", async (req, res, next) => {
  var { rows } = await db.query(
    "SELECT accompanyingdata, citation, datasource, datasourcelink, description, downloads, embargo, fileconnect, id, lakes_id, latitude, licenses_id, liveconnect, longitude, mapplot, mapplotfunction, maxdatetime, maxdepth, mindatetime, mindepth, organisations_id, origin, persons_id, plotproperties, prefile, prescript, projects_id, renku, repositories_id, title, monitor FROM datasets WHERE title IS NOT NULL AND dataportal IS NOT NULL"
  );
  res.status(200).send(rows);
});

/**
 * @swagger
 * /datasets/{id}:
 *  get:
 *    tags:
 *       ['Datasets']
 *    description: Get properties of specific dataset based on id
 *    parameters:
 *       - in: path
 *         name: id   # Note the name is the same as in the path
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The dataset ID.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT accompanyingdata, citation, datasource, datasourcelink, description, downloads, embargo, fileconnect, id, lakes_id, latitude, licenses_id, liveconnect, longitude, mapplot, mapplotfunction, maxdatetime, maxdepth, mindatetime, mindepth, organisations_id, origin, persons_id, plotproperties, prefile, prescript, projects_id, renku, repositories_id, title, monitor FROM datasets WHERE id = $1",
    [id]
  );
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send(rows[0]);
});

router.post("/", async (req, res, next) => {
  var dataset = req.body;
  var { verified, output, message } = await dataTypeVerification(
    "datasets",
    dataset
  );
  if (typeof dataset !== "object" || dataset === null) {
    return next(error(400, "Request body not an object"));
  } else if (!verified) {
    return next(error(400, "Request object does not agree with data type"));
  }
  // Build query
  var attr = [];
  var num = [];
  var values = [];
  var i = 1;
  for (var attribute in output) {
    if (attribute === "id" && output[attribute] !== null) {
      if (!isInt(output[attribute])) {
        return next(error(400, "ID must be an integer"));
      }
      var { rows: ids } = await db.query(
        "SELECT id FROM datasets WHERE id = $1",
        [output[attribute]]
      );
      if (ids.length !== 0) {
        return next(
          error(
            404,
            "ID already present in the database, please choose another ID or leave blank for auto ID assignment."
          )
        );
      }
    }
    if (attribute !== "id" || output[attribute] !== null) {
      attr.push(attribute);
      values.push(output[attribute]);
      num.push("$" + i);
      i++;
    }
  }
  var query = `INSERT INTO datasets (${attr.join()}) VALUES (${num.join()}) RETURNING *`;
  var { rows } = await db.query(query, values);
  res.status(201).send(rows[0]);
});

router.put("/", async (req, res, next) => {
  var dataset = req.body;
  var { verified, output, message } = await dataTypeVerification(
    "datasets",
    dataset
  );
  if (typeof dataset !== "object" || dataset === null) {
    return next(error(400, "Request body not an object"));
  } else if (!verified) {
    return next(error(400, "Request object does not agree with data type"));
  }
  // Build query
  var values = [];
  var pairs = [];
  var i = 1;

  for (var attribute in output) {
    if (attribute === "mindatetime" || attribute === "maxdatetime") {
      pairs.push(`${attribute} = $${i}`);
      values.push(unix2psqltime(output[attribute]));
      i++;
    } else if (attribute !== "id" && output[attribute] !== null) {
      pairs.push(`${attribute} = $${i}`);
      values.push(output[attribute]);
      i++;
    }
  }
  var query = `UPDATE datasets SET ${pairs.join()} WHERE id=$${i} RETURNING *`;
  values.push(output["id"]);

  var { rows } = await db.query(query, values);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(201).send(rows[0]);
});

router.delete("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rowCount } = await db.query("DELETE FROM datasets WHERE id = $1", [id]);
  if (rowCount < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send();
});

module.exports = router;
