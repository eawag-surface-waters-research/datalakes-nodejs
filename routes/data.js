const Router = require("express-promise-router");
const router = new Router();
const netcdf4 = require("netcdf4");
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const db = require("../db");
const { isInt, error } = require("../functions");

/**
 * @swagger
 * /data/{dataset_id}/{axis}:
 *  get:
 *    tags:
 *       ['Data']
 *    description: Get data for a given time based on file id, parameter and datetime (defaults to closest to now)
 *    parameters:
 *       - in: path
 *         name: dataset_id
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The dataset ID.
 *       - in: path
 *         name: axis
 *         required: true
 *         type: string
 *         description: Axis e.g. y1
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:dataset_id/:parameter", async (req, res, next) => {
  var id = req.params.dataset_id;
  var parameter = req.params.parameter;
  var timestamp = new Date();
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  if (req.query.timestamp) {
    try {
      timestamp = new Date(req.query.timestamp);
    } catch (e) {
      return next(error(400, "Invalid date format"));
    }
  }
  if (isNaN(timestamp)) {
    return next(
      error(
        400,
        "Invalid date format, needs to be ISO-8601 and the format is: YYYY-MM-DDTHH:mm:ss.sssZ"
      )
    );
  }
  const query = `
    SELECT *
    FROM files
    WHERE 
        (mindatetime <= $2
        AND maxdatetime >= $2
        AND datasets_id = $1
        AND filetype = 'json')
    OR (
        datasets_id = $1
        AND filetype = 'json'
        AND NOT EXISTS (
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
  var { rows: parameters } = await db.query(
    "SELECT * FROM datasetparameters WHERE datasets_id = $1 AND parameters_id = $2",
    [id, 1]
  );
  if (parameters.length < 1) {
    return next(error(404, "Time variable not found for dataset"));
  }
  var axis = parameters[0].axis;
  var link = rows[0].filelink;
  var data = await readFileAsync(
    __dirname.replace("routes", "") + link,
    "utf8"
  );
  data = JSON.parse(data);
  var time = data[axis];
  var index = findClosestDateIndex(time, timestamp);
  var dt = new Date(time[index] * 1000);

  if (data[parameter] === undefined) {
    return next(error(404, "Invalid parameter please select another"));
  }
  var array = data[parameter];
  var value;
  if (Array.isArray(array[0])) {
    return next(error(404, "Endpoint is only valid for 1D outputs"));
  } else {
    value = data[parameter][index];
  }
  res.status(200).send({ time: dt, value: value });
});

findClosestDateIndex = (datesArray, inputDate) => {
  const inputTimestamp = inputDate.getTime() / 1000;

  let minDifference = Infinity;
  let closestIndex = -1;

  for (let i = 0; i < datesArray.length; i++) {
    const timestamp = datesArray[i];
    const difference = Math.abs(timestamp - inputTimestamp);

    if (difference < minDifference) {
      minDifference = difference;
      closestIndex = i;
    }
  }
  return closestIndex;
};

module.exports = router;
