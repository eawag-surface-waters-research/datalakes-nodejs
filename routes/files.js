const Router = require("express-promise-router");
const router = new Router();
const netcdf4 = require("netcdf4");
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const db = require("../db");
const { isInt, error } = require("../functions");

/**
 * @swagger
 * /files/:
 *  get:
 *    tags:
 *       ['Files']
 *    description: Get files for specific dataset based on id
 *    parameters:
 *      - in: query
 *        name: dataset_id
 *        type: integer
 *        description: The id of the dataset
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/", async (req, res, next) => {
  if (req.query.datasets_id) {
    var id = req.query.datasets_id;
    if (!isInt(id)) {
      return next(error(400, "ID must be an integer"));
    }
    if (req.query.type) {
      if (!req.query.type === "json") {
        return next(error(400, "Type query not available, try using json"));
      }
      var { rows } = await db.query(
        "SELECT * FROM files WHERE datasets_id = $1 AND filetype = 'json'",
        [id]
      );
    } else {
      var { rows } = await db.query(
        "SELECT * FROM files WHERE datasets_id = $1",
        [id]
      );
    }

    if (rows.length < 1) {
      return next(error(404, "Dataset not found in database"));
    }
    res.status(200).send(rows);
  } else {
    var { rows } = await db.query("SELECT * FROM files");
    res.status(200).send(rows);
  }
});

/**
 * @swagger
 * /files/recent/{dataset_id}:
 *  get:
 *    tags:
 *       ['Files']
 *    description: Get most recent file for specific dataset based on dataset_id
 *    parameters:
 *      - in: path
 *        name: dataset_id
 *        type: integer
 *        description: The id of the dataset
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/recent/{id}", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var timestamp = new Date();
  const query = `
    SELECT *
    FROM files
    WHERE mindatetime <= $2
    AND maxdatetime >= $2
    AND datasets_id = $1
    AND filetype = 'json'
    OR (
        NOT EXISTS (
            SELECT 1
            FROM files
            WHERE mindatetime <= $2
            AND maxdatetime >= $2
            AND datasets_id = $1
            AND filetype = 'json'
        )
        AND (
            mindatetime = (
                SELECT MAX(mindatetime)
                FROM files
                WHERE mindatetime <= $2
                AND datasets_id = $1
                AND filetype = 'json'
            )
            OR maxdatetime = (
                SELECT MIN(maxdatetime)
                FROM files
                WHERE maxdatetime >= $2
                AND datasets_id = $1
                AND filetype = 'json'
            )
        )
    )
    ORDER BY ABS(EXTRACT(EPOCH FROM ($2 - mindatetime)))
    LIMIT 1;`;
  var { rows } = await db.query(query, [id, timestamp]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send(rows[0])
});

/**
 * @swagger
 * /files/{file_id}:
 *  get:
 *    tags:
 *       ['Files']
 *    description: Get metadata for a given file based on its file id
 *    parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The file ID.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM files WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  if (req.query.get) {
    if (req.query.get === "raw") {
      var link = rows[0].filelink;
      var data = await readFileAsync(
        __dirname.replace("routes", "") + link,
        "utf8"
      );
      res.status(200).send(JSON.parse(data));
    } else if (req.query.get === "metadata") {
      if (rows[0].filetype == "nc") {
        var nc = new netcdf4.File(rows[0].filelink, "r");
        var variables = [];
        var attributes = [];
        try {
          variables = JSON.parse(JSON.stringify(nc.root.variables));
        } catch (e) {
          variables = parseNCproperties(nc.root.variables);
        }
        try {
          attributes = JSON.parse(JSON.stringify(nc.root.attributes));
        } catch (e) {
          attributes = parseNCproperties(nc.root.attributes);
        }
        res.status(200).send({ variables, attributes });
      } else {
        return next(error(404, "Metadata only available for NetCDF files"));
      }
    } else {
      return next(error(400, "Malformed query"));
    }
  } else {
    res.status(200).send(rows[0]);
  }
});

parseNCproperties = (properties) => {
  parsed_properties = {};
  for (property in properties) {
    try {
      parsed_properties[property] = JSON.parse(
        JSON.stringify(properties[property])
      );
    } catch (e) {
      try {
        var keys = Object.keys(properties[property]);
        var out = {};
        for (var key of keys) {
          try {
            out[key] = JSON.parse(JSON.stringify(properties[property][key]));
          } catch (e) {
            try {
              var keys2 = Object.keys(properties[property][key]);
              var out2 = {};
              for (key2 of keys2) {
                try {
                  out2[key2] = JSON.parse(
                    JSON.stringify(properties[property][key][key2])
                  );
                } catch (e) {
                  out2[key2] = {};
                }
              }
              out[key] = out2;
            } catch (e) {
              out[key] = {};
            }
          }
        }
        parsed_properties[property] = JSON.parse(JSON.stringify(out));
      } catch (e) {
        parsed_properties[property] = {};
      }
    }
  }
  return parsed_properties;
};

router.post("/", async (req, res, next) => {
  var file = req.body;
  var { verified, output, message } = await dataTypeVerification("files", file);
  if (typeof file !== "object" || file === null) {
    return next(error(400, "Request body must be an object"));
  } else if (!verified) {
    return next(error(400, "Malformed request"));
  }
  // Build query
  var attr = [];
  var num = [];
  var values = [];
  var i = 1;
  for (var attribute in output) {
    if (attribute !== "id") {
      attr.push(attribute);
      values.push(output[attribute]);
      num.push("$" + i);
      i++;
    }
  }
  var query =
    "INSERT INTO files (" +
    attr.join() +
    ") VALUES (" +
    num.join() +
    ") RETURNING *";
  var { rows } = await db.query(query, values);
  res.status(201).send(rows[0]);
});

router.delete("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rowCount } = await db.query("DELETE FROM files WHERE id = $1", [id]);
  if (rowCount < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(201).send();
});

router.get("/clean/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "DELETE FROM files WHERE datasets_id = $1 AND filetype = 'json' RETURNING *",
    [id]
  );
  for (oldFile of rows) {
    await unlinkAsync(oldFile.filelink);
  }
  res.status(201).send();
});

module.exports = router;
