const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const format = require("pg-format");
const fs = require("fs");
const { spawn } = require("child_process");
const db = require("../db");
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

router.post("/temp/", async (req, res, next) => {
  // Verify inputs
  var attributes = {
    id: "integer",
    ssh: "varchar",
    dir: "varchar",
    branch: "varchar",
    file: "varchar",
  };
  var files = fs.readdirSync("git");
  var request = req.body;
  const { id, ssh, dir, branch, file } = request;
  if (typeof request !== "object" || request === null) {
    return next(error(400, "Request body must be an object"));
  }
  if (!checkObject(attributes, request)) {
    return next(error(400, "Malformed request"));
  }
  if (files.includes(id.toString())) {
    return next(error(400, "Malformed request"));
  }
  if (branch !== "master") {
    return next(error(400, "Must be on the master branch"));
  }
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  if (!verifySSH(ssh)) {
    return next(error(400, "Malformed request"));
  }

  logger("post", "gitclone", "Processing gitclone for repo: " + ssh);

  // Check if repository in database
  var repo_id;
  var { rows } = await db.query(
    "SELECT * FROM repositories WHERE ssh = $1 AND branch = $2",
    [ssh, branch]
  );
  if (rows.length > 0) {
    repo_id = rows[0].id;
  } else {
    var { rows } = await db.query(
      "INSERT INTO repositories (ssh,branch) VALUES ($1, $2) RETURNING *",
      [ssh, branch]
    );
    repo_id = rows[0].id;
  }

  // Check if repository has been cloned
  var repo_name = ssh.split("/")[1].split(".")[0];
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
      `&& git clone --depth 1 ${ssh} -b ${branch}`;
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
        // Discover files and filter for only NetCDF files
        var files = fs.readdirSync(`git/${repo_id}/${dir}`);
        files = files.filter((f) => f.split(".")[1] === "nc");

        // Files in folder
        var values = files.map((f) => [id, `git/${repo_id}/${dir}/${f}`, "nc"]);

        var query = format(
          "INSERT INTO files (datasets_id, filelink, filetype) VALUES %L RETURNING *",
          values
        );
        var { rows: outObj } = await db.query(query).catch((e) => {
          next(error(500, e));
        });

        var outFile = outObj.find(
          (f) => f.filelink === `git/${repo_id}/${dir}/${file}`
        );
        var allFiles = getFiles("git/" + repo_id);

        var output = {
          repo_id: repo_id,
          file: outFile,
          files: outObj,
          log: log,
          allFiles: allFiles,
        };

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
  var repo_name = ssh.split("/")[1].split(".")[0];
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
          const bucket = fs.readFileSync(
            `git/${repo_id}/${repo_name}/.bucket`,
            "utf8"
          );
          let bucket_name = bucket.replace("https://", "").split(".")[0];
          let remote = ssh.split("@")[1].split(".git", 1)[0].split(":");
          let host = remote[0];
          let group = remote[1].split("/")[0];
          let repository = remote[1].split("/")[1];
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
              reject(e);
            }
          });
        }

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
