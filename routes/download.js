const Router = require("express-promise-router");
const router = new Router();
const netcdf4 = require("netcdf4");
var Archiver = require("archiver");
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const db = require("../db");
const { isInt, error, logger } = require("../functions");
const zip = require("express-zip");
const creds = require("../config");
const path = require("path");

checkInt = (ids) => {
  var ver = true;
  for (var i = 0; i < ids.length; i++) {
    if (!isInt(ids[0])) {
      ver = false;
    }
  }
  return ver;
};

/**
 * @swagger
 * /download/csv/{file_id}:
 *  get:
 *    tags:
 *       ['Download']
 *    description: Download csv file based on its ID, password or API_KEY required to download embargoed datasets.
 *    parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The file ID.
 *       - in: query
 *         name: password
 *         type: string
 *         description: Password to allow access to embargoed data. Leave blank for unembargoed data or for data outside the embargo period.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/csv/:fileid/:password?", async (req, res, next) => {
  var fileid = req.params.fileid;
  if (!isInt(fileid)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows: files } = await db.query("SELECT * FROM files WHERE id = $1", [
    fileid,
  ]);
  if (files.length < 1) {
    return next(error(404, "File doesn't exist"));
  }
  var file = files[0];

  if (file.filetype !== "json") {
    var { rows: jsonfiles } = await db.query(
      "SELECT * FROM files WHERE filelineage = $1",
      [fileid]
    );
    if (jsonfiles.length < 1) {
      return next(
        error(404, "CSV convertion is only possible for JSON files not NetCDF.")
      );
    } else {
      file = jsonfiles[0];
    }
  }

  db.query("UPDATE datasets SET downloads = downloads + 1 WHERE id = $1", [
    file.datasets_id,
  ]);
  var { rows: datasets } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [file.datasets_id]
  );
  if (datasets.length < 1) {
    return next(error(404, "Error downloading file, dataset not found"));
  }
  var dataset = datasets[0];

  if (dataset.datasource !== "internal") {
    return next(
      error(404, "Datalakes does not allow downloading of external datasets")
    );
  }

  // Check password
  if (
    dataset.password !== "none" &&
    dataset.embargo > 0 &&
    creds.API_KEY !== req.header("api_key")
  ) {
    if (dataset.password !== req.query.password) {
      let embargoDate =
        new Date().getTime() - dataset.embargo * 30.4167 * 24 * 60 * 60 * 1000;
      var fileDate = new Date(file.maxdatetime).getTime();
      if (fileDate > embargoDate) {
        return next(
          error(
            403,
            `Permission denied. This dataset has a ${
              dataset.embargo
            } month embargo period. Data before ${new Date(
              embargoDate
            )} is freely accessible.`
          )
        );
      }
    }
  }

  // Convert JSON to CSV
  let rawdata = fs.readFileSync(file.filelink);
  let json = JSON.parse(rawdata);
  let csv = await JSONtoCSV(json);
  if (!csv) {
    return next(error(404, "Failed to convert file."));
  }
  let name = `${dataset.title.replace(" ", "_")}_${new Date(
    file.mindatetime
  ).toISOString()}_${new Date(file.maxdatetime).toISOString()}_${file.id}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="' + name + '"');
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Pragma", "no-cache");
  res.status(200).send(csv);
});

/**
 * @swagger
 * /download/{file_id}:
 *  get:
 *    tags:
 *       ['Download']
 *    description: Download specific file based on its ID, password or API_KEY required to download embargoed datasets.
 *    parameters:
 *       - in: path
 *         name: file_id
 *         required: true
 *         type: integer
 *         minimum: 1
 *         description: The file ID.
 *       - in: query
 *         name: password 
 *         type: string
 *         description: Password to allow access to embargoed data. Leave blank for unembargoed data or for data outside the embargo period.
 *    responses:
 *      '200':
 *        description: A successful response
 */
router.get("/:fileid/:password?", async (req, res, next) => {
  var fileid = req.params.fileid;
  if (!isInt(fileid)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows: files } = await db.query("SELECT * FROM files WHERE id = $1", [
    fileid,
  ]);
  if (files.length < 1) {
    return next(error(404, "File doesn't exist"));
  }
  var file = files[0];
  db.query("UPDATE datasets SET downloads = downloads + 1 WHERE id = $1", [
    file.datasets_id,
  ]);
  var { rows: datasets } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [file.datasets_id]
  );
  if (datasets.length < 1) {
    return next(error(404, "Error downloading file, dataset not found"));
  }
  var dataset = datasets[0];

  if (dataset.datasource !== "internal") {
    return next(
      error(404, "Datalakes does not allow downloading of external datasets")
    );
  }

  // Check password
  if (
    dataset.password !== "none" &&
    dataset.embargo > 0 &&
    creds.API_KEY !== req.header("api_key")
  ) {
    if (dataset.password !== req.query.password) {
      var fileDate;
      let embargoDate =
        new Date().getTime() - dataset.embargo * 30.4167 * 24 * 60 * 60 * 1000;
      if (file.filetype === "nc") {
        var { rows } = await db.query(
          "SELECT * FROM files WHERE filelineage = $1",
          [file.id]
        );
        if (rows.length < 1) {
          return next(
            error(404, "Error downloading file, can't find datetime")
          );
        }
        fileDate = new Date(rows[0].maxdatetime).getTime();
      } else {
        fileDate = new Date(file.maxdatetime).getTime();
      }
      if (fileDate > embargoDate) {
        return next(
          error(
            403,
            `Permission denied. This dataset has a ${
              dataset.embargo
            } month embargo period. Data before ${new Date(
              embargoDate
            )} is freely accessible.`
          )
        );
      }
    }
  }
  res.download(file.filelink, path.basename(file.filelink));
});

/**
 * @swagger
 * /download/csv:
 *  post:
 *    tags:
 *       ['Download']
 *    description: Download csv files based on their ID, password or API_KEY required to download embargoed datasets.
 *    produces:
 *      - application/zip
 *    parameters:
 *       - in: body
 *         name: file_ids
 *         description: List of file ids to download.
 *         schema:
 *           type: object
 *           required:
 *             - ids
 *           properties:
 *             ids:
 *               type: array
 *               items: {}
 *       - in: query
 *         name: password
 *         type: string
 *         description: Password to allow access to embargoed data. Leave blank for unembargoed data or for data outside the embargo period.
 *    responses:
 *      '200':
 *        description: A successful response
 *        schema:
 *          type: file
 */
router.post("/csv/", async (req, res, next) => {
  var ids = req.body.ids;

  if (ids.length < 1 || !checkInt(ids)) {
    return next(error(400, "Must be a list of integers"));
  }

  var { rows: files } = await db.query(
    "SELECT * FROM files WHERE id = ANY ($1)",
    [ids]
  );

  var datasets_ids = [...new Set(files.map((f) => f.datasets_id))];

  if (datasets_ids.length > 1) {
    return next(error(400, "All files must be part of the same dataset"));
  }

  for (var i = 0; i < files.length; i++) {
    if (files[i].filetype !== "json") {
      let { rows: jsonfiles } = await db.query(
        "SELECT * FROM files WHERE filelineage = $1",
        [files[i].id]
      );
      if (jsonfiles.length < 1) {
        return next(
          error(
            404,
            "CSV convertion is only possible for JSON files not NetCDF."
          )
        );
      } else {
        files[i] = jsonfiles[0];
      }
    }
  }

  var { rows: datasets } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [datasets_ids[0]]
  );

  if (datasets.length < 1) {
    return next(error(404, "Error downloading file, dataset not found"));
  }
  var dataset = datasets[0];

  if (dataset.datasource !== "internal") {
    return next(
      error(404, "Datalakes does not allow downloading of external datasets")
    );
  }

  if (
    dataset.password !== "none" &&
    dataset.embargo > 0 &&
    creds.API_KEY !== req.header("api_key")
  ) {
    if (dataset.password !== req.query.password) {
      var fileDate = 0;
      let embargoDate =
        new Date().getTime() - dataset.embargo * 30.4167 * 24 * 60 * 60 * 1000;
      for (var file of files) {
        fileDate = Math.max(new Date(file.maxdatetime).getTime());
        if (fileDate > embargoDate) {
          return next(
            error(
              403,
              `Permission denied. This dataset has a ${
                dataset.embargo
              } month embargo period. Data before ${new Date(
                embargoDate
              )} is freely accessible.`
            )
          );
        }
      }
    }
  }

  var name = dataset.title.replace(" ", "_");

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="' + name + '.zip"'
  );

  var zip = Archiver("zip");
  zip.pipe(res);

  // Add readme if exists
  try {
    let repo = fs.readdirSync(`git/${dataset.repositories_id}`);
    for (var f = 0; f < repo.length; f++) {
      let readme = `git/${dataset.repositories_id}/${repo[f]}/README.md`;
      if (fs.existsSync(readme)) {
        zip.file(readme, { name: "README.md" });
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Add parse information
  var infofilename = `metadata/${dataset.id}.txt`;
  if (!fs.existsSync(infofilename)) {
    await createParseInformationFile(dataset.id, infofilename);
  }
  zip.file(infofilename, { name: "parseInformation.txt" });

  // Add Files
  var name, rawdata, json, csv;
  for (var i = 0; i < files.length; i++) {
    name = `${dataset.title.replace(" ", "_")}_${new Date(
      files[i].mindatetime
    ).toISOString()}_${new Date(files[i].maxdatetime).toISOString()}_${
      files[i].id
    }.csv`;
    rawdata = fs.readFileSync(files[i].filelink);
    json = JSON.parse(rawdata);
    csv = await JSONtoCSV(json);
    if (!csv) {
      return next(error(404, "Failed to convert file."));
    }
    zip.append(csv, { name: name });
  }

  zip.finalize();
});

/**
 * @swagger
 * /download:
 *  post:
 *    tags:
 *       ['Download']
 *    description: Download specific files based on their ID, password or API_KEY required to download embargoed datasets.
 *    produces:
 *      - application/zip
 *    parameters:
 *       - in: body
 *         name: file_ids
 *         description: List of file ids to download.
 *         schema:
 *           type: object
 *           required:
 *             - ids
 *           properties:
 *             ids:
 *               type: array
 *               items: {}
 *       - in: query
 *         name: password 
 *         type: string
 *         description: Password to allow access to embargoed data. Leave blank for unembargoed data or for data outside the embargo period.
 *    responses:
 *      '200':
 *        description: A successful response
 *        schema:
 *          type: file
 */
router.post("/", async (req, res, next) => {
  var ids = req.body.ids;

  if (ids.length < 1 || !checkInt(ids)) {
    return next(error(400, "Must be a list of integers"));
  }

  var { rows: files } = await db.query(
    "SELECT * FROM files WHERE id = ANY ($1)",
    [ids]
  );

  var datasets_ids = [...new Set(files.map((f) => f.datasets_id))];

  if (datasets_ids.length > 1) {
    return next(error(400, "All files must be part of the same dataset"));
  }

  var { rows: datasets } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [datasets_ids[0]]
  );

  if (datasets.length < 1) {
    return next(error(404, "Error downloading file, dataset not found"));
  }
  var dataset = datasets[0];

  if (dataset.datasource !== "internal") {
    return next(
      error(404, "Datalakes does not allow downloading of external datasets")
    );
  }

  logger(
    "post",
    "download",
    "Creating download package for repo: " + dataset.title
  );

  if (
    dataset.password !== "none" &&
    dataset.embargo > 0 &&
    creds.API_KEY !== req.header("api_key")
  ) {
    if (dataset.password !== req.query.password) {
      var fileDate = 0;
      let embargoDate =
        new Date().getTime() - dataset.embargo * 30.4167 * 24 * 60 * 60 * 1000;
      for (var file of files) {
        if (file.filetype === "nc") {
          var { rows } = await db.query(
            "SELECT * FROM files WHERE filelineage = $1",
            [file.id]
          );
          if (rows.length < 1) {
            return next(
              error(404, "Error downloading file, can't find datetime")
            );
          }
          fileDate = Math.max(
            fileDate,
            new Date(rows[0].maxdatetime).getTime()
          );
        } else {
          fileDate = Math.max(new Date(file.maxdatetime).getTime());
        }
      }

      if (fileDate > embargoDate) {
        return next(
          error(
            403,
            `Permission denied. This dataset has a ${
              dataset.embargo
            } month embargo period. Data before ${new Date(
              embargoDate
            )} is freely accessible.`
          )
        );
      }
    }
  }

  var name = dataset.title.replace(" ", "_");

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="' + name + '.zip"'
  );

  var archive = Archiver("zip");

  archive.on("error", function (err) {
    res.status(500).send({ error: err.message });
  });

  archive.on("end", function () {
    logger(
      "post",
      "download",
      `Archive wrote ${Math.round(archive.pointer() / 1000000)}mb`,
      (indent = 1)
    );
    logger("post", "download", "Completed sending zip file");
  });

  res.attachment(
    dataset.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".zip"
  );
  archive.pipe(res);

  logger("post", "download", "Adding readme to bundle", (indent = 1));
  try {
    let repo = fs.readdirSync(`git/${dataset.repositories_id}`);
    for (var f = 0; f < repo.length; f++) {
      let readme = `git/${dataset.repositories_id}/${repo[f]}/README.md`;
      if (fs.existsSync(readme)) {
        archive.file(readme, { name: "README.md" });
      }
    }
  } catch (e) {
    console.error(e);
  }

  logger(
    "post",
    "download",
    "Adding parse information to bundle",
    (indent = 1)
  );
  var infofilename = `metadata/${dataset.id}.txt`;
  if (!fs.existsSync(infofilename)) {
    await createParseInformationFile(dataset.id, infofilename);
  }
  archive.file(infofilename, { name: "parseInformation.txt" });

  logger("post", "download", "Adding files to bundle", (indent = 1));
  var path, arr, name;
  for (var i = 0; i < files.length; i++) {
    path = files[i].filelink;
    arr = files[i].filelink.split("/");
    name = arr[arr.length - 1];
    if (files[i].filetype === "json") {
      name = `${dataset.title.replace(" ", "_")}_${new Date(
        files[i].mindatetime
      ).toISOString()}_${new Date(files[i].maxdatetime).toISOString()}_${
        files[i].id
      }.json`;
    }
    archive.file(path, { name: name });
  }
  archive.finalize();
});

async function createParseInformationFile(id, filename) {
  let content = "Datalakes Parse Parameters \n";
  content =
    content +
    "The table below maps the physical parameter to its given axis. \n \n";
  var { rows } = await db.query(
    "SELECT * FROM datasetparameters WHERE datasets_id = $1",
    [id]
  );
  content =
    content +
    `Axis | Parameter | NetCDF Parameter Name | Unit | Description \n`;
  for (var i = 0; i < rows.length; i++) {
    var { rows: rows2 } = await db.query(
      "SELECT * FROM parameters WHERE id = $1",
      [rows[i].parameters_id]
    );
    content =
      content +
      `${rows[i].axis} | ${rows2[0].name} | ${rows[i].parseparameter} | ${rows[i].unit} | ${rows2[0].description} \n`;
  }
  fs.writeFileSync(filename, content);
}

async function JSONtoCSV(json) {
  var keys = Object.keys(json);
  var csv = [];
  if (!keys.join("").includes("z")) {
    var row = [];
    for (var j = 0; j < keys.length; j++) {
      row.push(keys[j]);
    }
    csv.push(row.join(","));
    for (var i = 0; i < json[keys[0]].length; i++) {
      row = [];
      for (var j = 0; j < keys.length; j++) {
        row.push(json[keys[j]][i]);
      }
      csv.push(row.join(","));
    }
    csv = csv.join("\n");
  } else if (
    keys.length === 3 &&
    keys.includes("z") &&
    keys.includes("y") &&
    keys.includes("x")
  ) {
    csv.push([""].concat(json.x).join(","));
    for (var i = 0; i < json.y.length; i++) {
      csv.push([json.y[i]].concat(json.z[i]).join(","));
    }
    csv = csv.join("\n");
  } else if (!keys.includes("y1") && !keys.includes("x1")) {
    var row = [];
    for (var j = 0; j < keys.length; j++) {
      row.push(keys[j]);
    }
    csv.push(row.join(","));
    for (var i = 0; i < json.y.length; i++) {
      for (var k = 0; k < json.x.length; k++) {
        row = [];
        for (var j = 0; j < keys.length; j++) {
          if (keys[j].includes("z")) {
            row.push(json[keys[j]][i][k]);
          } else if ((keys[j] = "x")) {
            row.push(json.x[k]);
          } else if ((keys[j] = "y")) {
            row.push(json.y[i]);
          }
        }
        csv.push(row.join(","));
      }
    }
    csv = csv.join("\n");
  } else {
    csv = false;
  }
  return csv;
}

module.exports = router;
