const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const format = require("pg-format");
const fs = require("fs");
const { spawn } = require("child_process");
const db = require("../db");
const { error, parseUrl, logger } = require("../functions");
const creds = require("../config");

async function addFile(oldid, filelink, parameters, fileconnect) {
  logger("get", "refresh", "Adding file: " + filelink, (indent = 2));
  var url = creds.apiUrl + "/convert";
  var body = {
    id: oldid,
    variables: parameters,
    fileconnect: fileconnect,
  };
  try {
    await axios.post(url, body);
  } catch (e) {
    console.error(e);
  }
}

router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query(
    "SELECT * FROM datasets WHERE id = $1 AND datasource = $2",
    [id, "internal"]
  );

  if (rows.length !== 1) {
    return next(error(404, "Dataset not found in database"));
  }

  var dataset = rows[0];

  logger(
    "get",
    "refresh",
    "Refreshing dataset: " + id + " (" + dataset.title + ")"
  );
  res
    .status(201)
    .send("Refreshing dataset: " + id + " (" + dataset.title + ")");

  // Get dataset parameters
  var { rows: parameters } = await db.query(
    "SELECT * FROM datasetparameters WHERE datasets_id = $1",
    [id]
  );

  // Add info to parameters
  for (i = 0; i < parameters.length; i++) {
    parameters[i]["rAxis"] = parameters[i].axis;
    parameters[i]["included"] = true;
  }

  var { rows: repositories } = await db.query(
    "SELECT * FROM repositories WHERE id = $1",
    [dataset.repositories_id]
  );

  if (repositories.length !== 1) {
    return next(error(404, "Repository not found in database"));
  }

  var temp = repositories[0].ssh.split("/");
  var name = temp[temp.length - 1].split(".")[0];
  var repos_id = repositories[0].id;
  gitCommand =
    `cd git/${repos_id}/${name} ` +
    `&& git lfs install && git stash && git pull && git lfs prune`;
  var log = [];
  const child = spawn(gitCommand, {
    shell: true,
  });
  child.stdout.on("data", (data) => {
    log.push(`stdout: ${data}`);
  });
  child.stderr.on("data", (data) => {
    log.push(`stderr: ${data}`);
  });
  child.on("exit", async (data) => {
    if (data === 0) {
      logger("get", "refresh", "Successfully updated repo.", (indent = 1));

      await db.query("DELETE FROM files WHERE datasets_id = $1", [id]);

      logger("get", "refresh", "Removing exsting JSON files", (indent = 1));
      var filedir = `files/${id}`;
      var files = fs.readdirSync(filedir);
      for (const file of files) {
        if (fs.existsSync(`${filedir}/${file}`))
          fs.unlinkSync(`${filedir}/${file}`);
      }

      logger(
        "get",
        "refresh",
        "Create new files and add to database",
        (indent = 1)
      );
      var { ssh, dir, branch, file } = parseUrl(dataset.datasourcelink);
      if (dataset.fileconnect === "time") {
        var newfiles = fs.readdirSync(`git/${repos_id}/${dir}`);
      } else {
        var newfiles = [file];
      }

      newfiles = newfiles.filter((f) => f.endsWith('.nc'));
      var values = newfiles.map((f) => [
        id,
        `git/${repos_id}/${dir}/${f}`,
        "nc",
      ]);
      var query = format(
        "INSERT INTO files (datasets_id, filelink, filetype) VALUES %L RETURNING *",
        values
      );

      var { rows: ncfiles } = await db.query(query).catch((e) => {
        next(error(500, e));
      });

      for (ncfile of ncfiles) {
        await addFile(ncfile.id, ncfile.filelink, parameters, dataset.fileconnect);
      }
      logger("get", "refresh", "Successfully refreshed dataset.");
    } else {
      // Do something about broken repo
      gitCommand = `cd git/${repos_id}/${name} ` + `&& git stash && git pull`;
      const child = spawn(gitCommand, {
        shell: true,
      });
      console.error(log);
      console.error("Repository broken");
      res.status(400).send("Failed to refresh dataset.");
    }
  });
});

module.exports = router;
