const Router = require("express-promise-router");
const router = new Router();
const { isInt, error } = require("../functions");
const db = require("../db");

/**
 * @swagger
 * /selectiontables:
 *  get:
 *    tags:
 *       ['Selection Tables']
 *    description: Download look up tables for Datalakes database.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/", async (req, res, next) => {
  var st = await Promise.all([
    db.query("SELECT * FROM parameters"),
    db.query("SELECT * FROM lakes"),
    db.query("SELECT * FROM organisations"),
    db.query("SELECT * FROM persons"),
    db.query("SELECT * FROM projects"),
    db.query("SELECT * FROM sensors"),
    db.query("SELECT * FROM licenses")
  ]);
  var selectiontables = {
    parameters: st[0].rows,
    lakes: st[1].rows,
    organisations: st[2].rows,
    persons: st[3].rows,
    projects: st[4].rows,
    sensors: st[5].rows,
    licenses: st[6].rows,
    axis: [{ name: "M" }, { name: "x" }, { name: "y" }, { name: "z" }]
  };
  res.status(200).send(selectiontables);
});

/**
 * @swagger
 * /selectiontables/{table}:
 *  get:
 *    tags:
 *       ['Selection Tables']
 *    description: Download specific look up table for Datalakes database.
 *    parameters:
 *       - in: path
 *         name: table   # Note the name is the same as in the path
 *         description: Table name.
 *         required: true
 *         type: string
 *         minimum: 1
 *         default: "parameters"
 *         enum: ["parameters","lakes","organisations","persons","projects","sensors","licenses"]   
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:table", async (req, res, next) => {
  const table = req.params.table;
  const tables = [
    "parameters",
    "lakes",
    "organisations",
    "persons",
    "projects",
    "sensors",
    "licenses"
  ];
  if (!tables.includes(table)) {
    return next(error(400, "Table not available"));
  }
  var { rows } = await db.query(`SELECT * FROM ${table}`);
  res.status(200).send(rows);
});


/**
 * @swagger
 * /selectiontables/{table}/{id}:
 *  get:
 *    tags:
 *       ['Selection Tables']
 *    description: Download specific parameter in specific look up table for Datalakes database.
 *    parameters:
 *       - in: path
 *         name: table   # Note the name is the same as in the path
 *         required: true
 *         type: string
 *         minimum: 1
 *         description: Table name.
 *         default: "parameters"
 *         enum: ["parameters","lakes","organisations","persons","projects","sensors","licenses"]
 *       - in: path
 *         name: id   # Note the name is the same as in the path
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: Parameter id. 
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:table/:id", async (req, res, next) => {
  const table = req.params.table;
  const id = req.params.id;
  const tables = [
    "parameters",
    "lakes",
    "organisations",
    "persons",
    "projects",
    "sensors",
    "licenses"
  ];
  if (!tables.includes(table)) {
    return next(error(400, "Table not available"));
  } else if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(`SELECT * FROM ${table} WHERE id = ${id}`);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send(rows[0]);
});

router.post("/", async (req, res, next) => {
  var { table, data } = req.body;
  const tables = [
    "parameters",
    "lakes",
    "organisations",
    "persons",
    "projects",
    "sensors",
    "licenses"
  ];
  if (!tables.includes(table)) {
    return next(error(400, "Table not available"));
  }
  if (typeof data !== "object" || data === null) {
    return next(error(400, "Request body not an object"));
  }
  // Build query
  var attr = [];
  var num = [];
  var values = [];
  var i = 1;
  for (var attribute in data) {
    if (attribute !== "id") {
      attr.push(attribute);
      values.push(data[attribute]);
      num.push("$" + i);
      i++;
    }
  }
  var query = `INSERT INTO ${table} (${attr.join()}) VALUES (${num.join()}) RETURNING *`;
  var { rows } = await db.query(query, values);
  res.status(201).send(rows[0]);
});

module.exports = router;
