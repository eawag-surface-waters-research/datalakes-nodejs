const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const rmdirAsync = promisify(fs.rmdir);
const { walk } = require("../functions");

router.get("/", async (req, res, next) => {
  // Remove incomplete rows from datasets
  await db.query("DELETE FROM datasets WHERE title IS NULL");

  // Remove files and folders from directory
  var { rows } = await db.query("SELECT * FROM datasets");

  // Remove metadata files
  var files = fs.readdirSync("./metadata");
  try {
    for (file of files) {
      if (
        rows.filter((item) => item.id.toString() === file.split(".")[0])
          .length < 1
      ) {
        if (file !== ".gitkeep") {
          await unlinkAsync("./metadata/" + file);
        }
      }
    }
  } catch (err) {}

  // Delete folders (& files) from files folder not present in datasets table
  var files = fs.readdirSync("./files");
  try {
    for (folder of files) {
      if (
        rows.filter((item) => item.id.toString() === folder.toString()).length <
        1
      ) {
        var dir = await walk("./files/" + folder);
        for (file of dir[0]) {
          await unlinkAsync(file);
        }
        for (file of dir[1].reverse()) {
          await rmdirAsync(file);
        }
        await rmdirAsync("./files/" + folder);
      }
    }
  } catch (err) {}

  // Remove files and folders from directory
  var { rows } = await db.query("SELECT * FROM repositories");

  // Delete folders (& files) from git folder not present in repositories table
  var git = fs.readdirSync("./git");
  try {
    for (folder of git) {
      if (
        rows.filter((item) => item.id.toString() === folder.toString()).length <
        1
      ) {
        var dir = await walk("./git/" + folder);
        for (file of dir[0]) {
          await unlinkAsync(file);
        }
        for (file of dir[1].reverse()) {
          await rmdirAsync(file);
        }
        await rmdirAsync("./git/" + folder);
      }
    }
  } catch (err) {}

  // Remove successful clonestatus
  await db.query("DELETE FROM clonestatus WHERE status = $1", ["succeeded"]);

  // Remove ss rows from parameter_list
  await db.query("DELETE FROM datasetparameters WHERE datasets_id IS NULL");
  await db.query(
    "DELETE FROM datasetparameters WHERE datasets_id NOT IN (SELECT id FROM datasets)"
  );

  // Remove ss rows from file_list
  await db.query("DELETE FROM files WHERE datasets_id IS NULL");
  await db.query(
    "DELETE FROM files WHERE datasets_id NOT IN (SELECT id FROM datasets)"
  );

  res.status(201).send("Cleaned");
});

module.exports = router;
