const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const format = require("pg-format");
const fs = require("fs");
const { spawn } = require("child_process");
const db = require("../db");
const path = require("path");
var AWS = require("aws-sdk");
const { checkObject, error, logging } = require("../functions");

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      if (!name.includes("/.") && !files_.includes(name)) files_.push(name);
    }
  }
  return files_;
}

function verifySSH(ssh) {
  if (ssh.includes(" ") || ssh.includes("&")) {
    return false;
  }
  if (ssh.split("@")[0] !== "git") {
    return false;
  }
  if (ssh.slice(ssh.length - 4) !== ".git") {
    return false;
  }
  return true;
}

router.get("/status/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM clonestatus WHERE id = $1", [
    id,
  ]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  res.status(200).send(rows[0]);
});

router.post("/", async (req, res, next) => {
  var request = req.body;
  const { ssh } = request;
  if (typeof request !== "object" || request === null) {
    return next(error(400, "Request body must be an object"));
  }
  if (!verifySSH(ssh)) {
    return next(error(400, "Malformed request"));
  }

  logger("post", "gitclone", "Processing gitclone for repo: " + ssh);

  // Check if repository in database
  var repo_id;
  var { rows } = await db.query("SELECT * FROM repositories WHERE ssh = $1", [
    ssh,
  ]);
  if (rows.length > 0) {
    repo_id = rows[0].id;
  } else {
    var { rows } = await db.query(
      "INSERT INTO repositories (ssh) VALUES ($1) RETURNING *",
      [ssh]
    );
    repo_id = rows[0].id;
  }

  // Check if repository has been cloned
  var repo_name = ssh.substring(ssh.lastIndexOf("/") + 1).split(".")[0];
  var mode = "new";
  if (fs.existsSync(`git/${repo_id}/${repo_name}`)) {
    mode = "existing";
  }

  // Load git command
  var gitCommand;
  if (mode === "new") {
    logger("post", "gitclone", "Cloning new repository", (indent = 1));
    gitCommand =
      `mkdir git/${repo_id} ` +
      `&& cd git/${repo_id} ` +
      `&& git clone --depth 1 ${ssh}`;
  } else {
    logger("post", "gitclone", "Pulling existing repository", (indent = 1));
    gitCommand = `cd git/${repo_id}/${repo_name} && git stash && git pull`;
  }

  // Handle clone status
  var { rows: clonestatus } = await db.query(
    "INSERT INTO clonestatus (status,message,repositories_id) VALUES ($1, $2, $3) RETURNING *",
    ["inprogress", "Starting repository clone", repo_id]
  );
  var clonestatus_id = clonestatus[0].id;
  var log = [];

  // Send response to client
  res.status(200).send({ clonestatus_id });

  // Run the server commands
  const child = spawn(gitCommand, {
    shell: true,
  });

  child.stdout.on("data", (data) => {
    db.query("UPDATE clonestatus SET message = $1 WHERE id = $2", [
      data,
      clonestatus_id,
    ]);
    log.push(`stdout: ${data}`);
    logger("post", "gitclone", `stdout: ${data}`, (indent = 2));
  });
  child.stderr.on("data", (data) => {
    db.query("UPDATE clonestatus SET message = $1 WHERE id = $2", [
      data,
      clonestatus_id,
    ]);
    log.push(`stdout: ${data}`);
    console.error(`stdout: ${data}`);
  });
  child.on("error", async (data) => {
    if (mode === "new") {
      await db.query("DELETE FROM repositories WHERE id = $1", [repo_id]);
    }
    await db.query(
      "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
      ["failed", log, clonestatus_id]
    );
  });
  child.on("exit", async (data) => {
    try {
      if (data === 0) {
        logger(
          "post",
          "gitclone",
          "Successfully cloned/ updated.",
          (indent = 1)
        );

        var bucket_files = [];
        if (fs.existsSync(`git/${repo_id}/${repo_name}/.bucket`)) {
          logger(
            "post",
            "gitclone",
            "Collecting list of files from S3 bucket.",
            (indent = 1)
          );

          const bucket = fs.readFileSync(
            `git/${repo_id}/${repo_name}/.bucket`,
            "utf8"
          );
          let bucket_name = bucket.replace("https://", "").split(".")[0];
          let remote = ssh.split("@")[1].split(".git", 1)[0].split(":");
          let host = remote[0];
          let group = remote[1].substring(0, remote[1].lastIndexOf("/"));
          let repository = remote[1].substring(remote[1].lastIndexOf("/") + 1);
          const s3 = new AWS.S3();

          const params = {
            Bucket: bucket_name,
            Prefix: `${host}/${group}/${repository}/data/`,
            MaxKeys: 1000,
          };

          bucket_files = await new Promise((resolve, reject) => {
            try {
              const allKeys = [];
              listAllKeys();
              function listAllKeys() {
                s3.listObjectsV2(params, function (err, data) {
                  if (err) {
                    reject(err);
                  } else {
                    var contents = data.Contents;
                    contents.forEach(function (content) {
                      if (content.Key.slice(-3) == ".nc") {
                        let lastIndex = content.Key.lastIndexOf("/");
                        let folder =
                          content.Key.slice(0, lastIndex).replace(
                            `${host}/${group}`,
                            `git/${repo_id}`
                          ) + "/placeholder.nc";
                        if (!allKeys.includes(folder)) {
                          allKeys.push(folder);
                        }
                      }
                    });
                    if (data.IsTruncated) {
                      params.ContinuationToken = data.NextContinuationToken;
                      listAllKeys();
                    } else {
                      resolve(allKeys);
                    }
                  }
                });
              }
            } catch (e) {
              logger(
                "post",
                "gitclone",
                `Failed to collect list of S3 files: ${e}`,
                (indent = 1)
              );
              reject(e);
            }
          });
        }

        logger(
          "post",
          "gitclone",
          "Successfully collected list of S3 files",
          (indent = 1)
        );

        var allFiles = getFiles("git/" + repo_id, bucket_files);

        var output = { repo_id, allFiles, log };

        await db.query(
          "UPDATE clonestatus SET message = $1, status = $2 WHERE id = $3",
          [output, "succeeded", clonestatus_id]
        );
      } else {
        if (mode === "new") {
          await db.query("DELETE FROM repositories WHERE id = $1", [repo_id]);
        }
        await db.query(
          "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
          ["failed", log, clonestatus_id]
        );
      }
    } catch (error) {
      console.log(error.message);
      await db.query(
        "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
        ["failed", error.message, clonestatus_id]
      );
    }
  });
});

router.post("/files/", async (req, res, next) => {
  var request = req.body;
  const { id, folder, ssh } = request;
  if (typeof request !== "object" || request === null) {
    return next(error(400, "Request body must be an object"));
  }
  if (folder === path.basename(folder)) {
    return next(error(400, "Folder must be a path"));
  }
  if (!verifySSH(ssh)) {
    return next(error(400, "Malformed request"));
  }

  logger("post", "gitclone/files", "Processing files from folder: " + folder);

  var folder_list = folder.split("/");
  var repo_id = folder_list[1];
  var repo_name = folder_list[2];
  var folder_path = folder_list.slice(3, folder_list.length).join("/");
  var download_files = false;

  if (fs.existsSync(`git/${repo_id}/${repo_name}/.bucket`)) {
    logger("post", "gitclone/files", "Processing cloud storage files");
    download_files = true;
    const bucket = fs.readFileSync(
      `git/${repo_id}/${repo_name}/.bucket`,
      "utf8"
    );
    var bucket_name = bucket.replace("https://", "").split(".")[0];
    var remote = ssh.split("@")[1].split(".git", 1)[0].split(":");
    var host = remote[0];
    var group = remote[1].substring(0, remote[1].lastIndexOf("/"));
    var repository = remote[1].substring(remote[1].lastIndexOf("/") + 1);

    const s3 = new AWS.S3();

    const params = {
      Bucket: bucket_name,
      Prefix: `${host}/${group}/${repository}/${folder_path}`,
      MaxKeys: 1000,
    };

    bucket_files = await new Promise((resolve, reject) => {
      try {
        const allKeys = [];
        listAllKeys();
        function listAllKeys() {
          s3.listObjectsV2(params, function (err, data) {
            if (err) {
              reject(err);
            } else {
              var contents = data.Contents;
              contents.forEach(function (content) {
                if (content.Key.slice(-3) == ".nc") {
                  let file = content.Key.replace(
                    `${host}/${group}`,
                    `git/${repo_id}`
                  );
                  if (!allKeys.includes(file)) {
                    allKeys.push(file);
                  }
                }
              });
              if (data.IsTruncated) {
                params.ContinuationToken = data.NextContinuationToken;
                listAllKeys();
              } else {
                resolve(allKeys);
              }
            }
          });
        }
      } catch (e) {
        reject(e);
      }
    });

    var values = bucket_files.map((f) => [id, f, "nc"]);
    var query = format(
      "INSERT INTO files (datasets_id, filelink, filetype) VALUES %L RETURNING *",
      values
    );
    var { rows: outObj } = await db.query(query).catch((e) => {
      next(error(500, e));
    });

    var file = outObj[0];

    // Handle status
    var { rows: status } = await db.query(
      "INSERT INTO clonestatus (status,message,repositories_id) VALUES ($1, $2, $3) RETURNING *",
      ["inprogress", `Starting folder sync from ${bucket}`, repo_id]
    );
    var status_id = status[0].id;
    var log = [];

    res.status(200).send({ status_id, file, files: outObj });
  } else if (fs.existsSync(folder)) {
    var files = fs.readdirSync(folder);
    files = files.filter((f) => f.endsWith('.nc'));
    if (files.length > 0) {
      var values = files.map((f) => [id, `${folder}/${f}`, "nc"]);
      var query = format(
        "INSERT INTO files (datasets_id, filelink, filetype) VALUES %L RETURNING *",
        values
      );
      var { rows: outObj } = await db.query(query).catch((e) => {
        next(error(500, e));
      });

      var file = outObj[0];
      res.status(200).send({ file, files: outObj });
    }
  } else {
    return next(
      error(400, "Cannot locate folder or cloud storage instructions")
    );
  }

  if (download_files) {
    var bucket_uri = `s3://${bucket_name}/${host}/${group}/${repository}/${folder_path}`;
    var command = `aws s3 sync ${bucket_uri} ${folder}`;
    logger(
      "post",
      "gitclone/files",
      `Executing command ${command}`,
      (indent = 1)
    );

    // Run the server commands
    const child = spawn(command, {
      shell: true,
    });

    child.stdout.on("data", (data) => {
      db.query("UPDATE clonestatus SET message = $1 WHERE id = $2", [
        data,
        status_id,
      ]);
      log.push(`stdout: ${data}`);
      logger("post", "gitclone/files", `stdout: ${data}`, (indent = 2));
    });
    child.stderr.on("data", (data) => {
      db.query("UPDATE clonestatus SET message = $1 WHERE id = $2", [
        data,
        status_id,
      ]);
      log.push(`stdout: ${data}`);
      console.error(`stdout: ${data}`);
    });
    child.on("error", async (data) => {
      await db.query(
        "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
        ["failed", log, status_id]
      );
    });
    child.on("exit", async (data) => {
      try {
        if (data === 0) {
          logger(
            "post",
            "gitclone/files",
            "Sync completed successfully.",
            (indent = 1)
          );
          await db.query(
            "UPDATE clonestatus SET message = $1, status = $2 WHERE id = $3",
            ["Sync completed successfully", "succeeded", status_id]
          );
        } else {
          await db.query(
            "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
            ["failed", log, status_id]
          );
        }
      } catch (error) {
        console.log(error.message);
        await db.query(
          "UPDATE clonestatus SET status = $1, message = $2 WHERE id = $3",
          ["failed", error.message, status_id]
        );
      }
    });
  }
});

getListingS3 = (prefix) => {
  return new Promise((resolve, reject) => {
    try {
      let params = {
        Bucket: AWS_S3.BUCKET_NAME,
        MaxKeys: 1000,
        Prefix: prefix,
        Delimiter: prefix,
      };
      const allKeys = [];
      listAllKeys();
      function listAllKeys() {
        s3.listObjectsV2(params, function (err, data) {
          if (err) {
            reject(err);
          } else {
            var contents = data.Contents;
            contents.forEach(function (content) {
              allKeys.push(content.Key);
            });

            if (data.IsTruncated) {
              params.ContinuationToken = data.NextContinuationToken;
              console.log("get further list...");
              listAllKeys();
            } else {
              resolve(allKeys);
            }
          }
        });
      }
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = router;
