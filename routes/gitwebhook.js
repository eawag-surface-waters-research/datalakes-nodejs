const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const format = require("pg-format");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const { spawn } = require("child_process");
const db = require("../db");
const { error, parseUrl, logger } = require("../functions");
const creds = require("../config");

router.post("/", async (req, res, next) => {
  if ("x-gitlab-event" in req.headers) {
    var body = req.body;
    if (body.object_kind === "push") {
      try {
        var ssh = body.repository.git_ssh_url;
        var ref = body.ref.split("/");
        var branch = ref[ref.length - 1];
        var commits = body.commits;
        commits.sort(compareTimeAscending);
      } catch (e) {
        console.log(e);
        return next(error(400, "Malformed webhook."));
      }
    } else {
      return next(error(400, "Only push events are accepted."));
    }
  } else {
    return next(error(400, "Request headers not valid."));
  }

  var { rows: repositories } = await db.query(
    "SELECT * FROM repositories WHERE ssh = $1 AND branch = $2",
    [ssh, branch]
  );

  if (repositories.length < 1) {
    return next(error(400, "Repository not in database."));
  }

  res.status(204).send();

  // Update Repo
  var temp = repositories[0].ssh.split("/");
  var name = temp[temp.length - 1].split(".")[0];
  logger("post", "gitwebhook", "Processing webhook for repo: " + name);
  var repos_id = repositories[0].id;
  gitCommand =
    `cd git/${repos_id}/${name} ` +
    `&& git lfs install && git pull && sudo git lfs prune`;
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
      var { rows: datasets } = await db.query(
        "SELECT * FROM datasets WHERE liveconnect = 'true' AND repositories_id = $1",
        [repos_id]
      );

      if (datasets.length < 1) {
        console.error("Dataset not in database");
        return;
      }

      logger(
        "post",
        "gitwebhook",
        "Extracting data from commits",
        (indent = 1)
      );
      var dataset, i;
      for (dataset of datasets) {
        try {
          // Get current files
          var { rows: files } = await db.query(
            "SELECT * FROM files WHERE datasets_id = $1",
            [dataset.id]
          );

          // Get dataset parameters
          var { rows: parameters } = await db.query(
            "SELECT * FROM datasetparameters WHERE datasets_id = $1",
            [dataset.id]
          );

          // Add info to parameters
          for (i = 0; i < parameters.length; i++) {
            parameters[i]["rAxis"] = parameters[i].axis;
            parameters[i]["included"] = true;
          }

          // Loop overs datasets
          for (i = 0; i < commits.length; i++) {
            try {
              await added(
                commits[i].added,
                dataset,
                files,
                parameters,
                name,
                repos_id
              );
              await modified(
                commits[i].modified,
                dataset,
                files,
                parameters,
                name,
                repos_id
              );
              await removed(commits[i].removed, dataset, files, name, repos_id);
            } catch (e) {
              console.error(e);
            }
          }

          logger(
            "post",
            "gitwebhook",
            "Check fully syncronised and add orphan files",
            (indent = 1)
          );
          var { dir } = parseUrl(dataset.datasourcelink);
          var localFileList = fs.readdirSync("git/" + repos_id + "/" + dir);
          localFileList = localFileList.filter((f) => f.split(".")[1] === "nc");
          localFileList = localFileList.map(
            (lfl) => "git/" + repos_id + "/" + dir + "/" + lfl
          );
          var { rows: globalFileList } = await db.query(
            "SELECT * FROM files WHERE datasets_id = $1 AND filetype = $2",
            [dataset.id, "nc"]
          );

          var globalNames = globalFileList.map((gfl) => gfl.filelink);

          for (var k = 0; k < localFileList.length; k++) {
            let duplicates = globalFileList.filter(
              (gfl) => gfl.filelink === localFileList[k]
            );
            if (!globalNames.includes(localFileList[k])) {
              var filetype = localFileList[k].split(".").pop();
              addFile(
                dataset.id,
                localFileList[k],
                filetype,
                parameters,
                dataset.fileconnect
              );
            } else if (duplicates.length > 1) {
              for (let d = 0; d < duplicates.length; d++) {
                if (d !== 0) {
                  removeFile(duplicates[d]);
                }
              }
            }
          }

          for (var l = 0; l < globalNames.length; l++) {
            if (!localFileList.includes(globalNames[l])) {
              removeFile(globalFileList[k]);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      // Do something about broken repo
      logger("post", "gitwebhook", "Connection to repository broken");
      var repo_id = repositories[0].id;
      gitCommand = `cd git/${repo_id}/${name} ` + `&& git stash && git pull`;
      const child = spawn(gitCommand, {
        shell: true,
      });
      console.error(log);
      console.error("Repository broken");
    }
  });
});

inFolder = (link, folder) => {
  var farr = folder.split("/blob/")[1].split("/");
  farr.pop();
  farr.shift();
  var arr = link.split("/");
  arr.shift();
  arr.pop();
  return arr.join("/") === farr.join("/");
};

addFile = async (datasets_id, filelink, filetype, parameters, fileconnect) => {
  logger("post", "gitwebhook", "Adding file: " + filelink, (indent = 2));
  var { rows: newfiles } = await db.query(
    "INSERT INTO files (datasets_id, filelink, filetype) VALUES ($1,$2,$3) RETURNING *",
    [datasets_id, filelink, filetype]
  );
  var url = creds.apiUrl + "/convert";
  var body = {
    id: newfiles[0].id,
    variables: parameters,
    fileconnect: fileconnect,
  };
  try {
    await axios.post(url, body);
  } catch (e) {
    console.error(e);
  }
};

added = async (added, dataset, files, parameters, name, repo_id) => {
  var filelink, filedetails, addedFile;
  for (var j = 0; j < added.length; j++) {
    addedFile = name + "/" + added[j];

    filelink = `git/${repo_id}/${addedFile}`;
    filedetails = files.filter((file) => file.filelink === filelink);
    var arr = addedFile.split(".");
    var filetype = arr[arr.length - 1];
    if (
      inFolder(addedFile, dataset.datasourcelink) &&
      filedetails.length === 0
    ) {
      addFile(dataset.id, filelink, filetype, parameters, dataset.fileconnect);
    }
  }
  return;
};

modified = async (modified, dataset, files, parameters, name, repo_id) => {
  var link, filedetails, modifiedFile;
  for (var j = 0; j < modified.length; j++) {
    modifiedFile = name + "/" + modified[j];
    link = `git/${repo_id}/${modifiedFile}`;
    logger("post", "gitwebhook", "Modifying file: " + link, (indent = 2));
    filedetails = files.filter((file) => file.filelink === link);
    if (filedetails.length === 1) {
      jsonfile = files.find((file) => file.filelineage === filedetails[0].id);
      if (jsonfile) {
        // Delete json file from database
        await db.query("DELETE FROM files WHERE id = $1", [jsonfile.id]);
        // Delete json file
        if (fs.existsSync(jsonfile.filelink))
          await unlinkAsync(jsonfile.filelink);
      }

      // Create new file
      var url = creds.apiUrl + "/convert";
      var body = {
        id: filedetails[0].id,
        variables: parameters,
        fileconnect: dataset.fileconnect,
      };
      try {
        await axios.post(url, body);
      } catch (e) {
        console.error(e);
      }
    } else {
      //await added(modified, dataset, files, parameters, name, repo_id);
    }
  }
};

removeFile = async (file) => {
  if (file) {
    logger("post", "gitwebhook", "Removing file: " + file, (indent = 2));
    // Delete file from database
    await db.query("DELETE FROM files WHERE id = $1", [file.id]);

    // Remove from local
    if (fs.existsSync(file.filelink)) await unlinkAsync(file.filelink);
  }
  if (file.filetype === "json") {
    // Delete nc file from database
    await db.query("DELETE FROM files WHERE id = $1", [file.filelineage]);
  } else if (file.filetype === "nc") {
    await db.query("DELETE FROM files WHERE filelineage = $1", [file.id]);
  }
};

removed = async (removed, dataset, files, name, repo_id) => {
  var link, filedetails, removedFile;
  for (var j = 0; j < removed.length; j++) {
    removedFile = name + "/" + removed[j];
    link = `git/${repo_id}/${removedFile}`;
    filedetails = files.filter((file) => file.filelink === link);
    if (filedetails.length === 1) {
      jsonfile = files.find((file) => file.filelineage === filedetails[0].id);
      removeFile(jsonfile);
    }
  }
};

compareTimeAscending = (a, b) => {
  var aa = new Date(a.timestamp);
  var bb = new Date(b.timestamp);
  if (aa < bb) {
    return -1;
  }
  if (aa > bb) {
    return 1;
  }
  return 0;
};

module.exports = router;
