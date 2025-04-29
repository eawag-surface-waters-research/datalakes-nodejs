const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const fs = require("fs");
const csv = require('csv-parser');
const zip = require("express-zip");
const { error } = require("../functions");

parseSQLarray = (string) => {
  return string
    .replace("{", "")
    .replace("}", "")
    .replace(/['"]+/g, "")
    .split(",");
};

parseEventDate = (dateString) => {
  // Extract components from the string "yyyyMMdd HH:mm:ss"
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  
  // Extract time components (after the space)
  const timeStr = dateString.substring(9);
  
  // Construct a date string in ISO format: YYYY-MM-DDTHH:mm:ss
  const isoString = `${year}-${month}-${day}T${timeStr}`;
  
  return new Date(isoString);
};

router.get("/scripts/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM datasets WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }

  var accompanyingdata = parseSQLarray(rows[0].accompanyingdata);
  accompanyingdata = accompanyingdata.filter((ad) =>
    ["py", "r", "js", "md"].includes(ad.split(".")[1])
  );

  var out = [];
  for (var i = 0; i < accompanyingdata.length; i++) {
    out.push({
      name: accompanyingdata[i],
      data: fs.readFileSync(accompanyingdata[i], "utf8"),
    });
  }
  res.status(200).send(out);
});

router.get("/events/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM datasets WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }

  var dataset = rows[0];
  var dir = dataset.datasourcelink.split("/")[0];
  var eventsPath = `git/${dataset.repositories_id}/${dir}/notes/events.csv`;
  if (!fs.existsSync(eventsPath)) {
    return next(error(404, "Events file not found"));
  }
  var events = [];
  fs.createReadStream(eventsPath)
    .pipe(csv({
      separator: ";",
      mapHeaders: ({ header, index }) => header.toLowerCase(),
      mapValues: ({ header, index, value }) => {
        if (header === "start" || header === "stop") {
          return parseEventDate(value).toISOString();
        }
        return value;
      },
    }))
    .on("data", (row) => {
      events.push(row);
    })
    .on("end", () => {
      res.status(200).send(events);
    });
});

router.get("/files/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM datasets WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  var zipFile = [];
  var downloadname = rows[0].title.replace(" ","_")+"_datalakespipeline.zip"
  var accompanyingdata = parseSQLarray(rows[0].accompanyingdata);
  for (var i = 0; i < accompanyingdata.length; i++) {
    zipFile = addZipFile(zipFile, accompanyingdata[i]);
  }

  if (zipFile.length > 0) {
    res.status(200).zip(zipFile,downloadname);
  } else {
    res.status(200).send("No files found");
  }
});

fileName = (name) => {
  var arr = name.split("/");
  return arr[arr.length - 1];
};

addZipFile = (zipFile, path) => {
  var name = fileName(path);

  // Check file exists
  if (fs.existsSync(path)) {
    zipFile.push({ path, name });
  }
  return zipFile;
};

module.exports = router;
