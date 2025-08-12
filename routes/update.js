const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const format = require("pg-format");
const fs = require("fs");
const { promisify } = require("util");
const unlinkAsync = promisify(fs.unlink);
const { spawn } = require("child_process");
const db = require("../db");
const { error, logger } = require("../functions");
const creds = require("../config");

// S3 Connections
var AWS = require("aws-sdk");
AWS.config.setPromisesDependency();
const s3 = new AWS.S3();

router.get("/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows: datasets } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [id]
  );
  if (datasets.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  var dataset = datasets[0];

  if (dataset.liveconnect !== "true") {
    return next(error(404, "Dataset is not configured for live connection"));
  }

  var { rows: repositories } = await db.query(
    "SELECT * FROM repositories WHERE id = $1",
    [dataset.repositories_id]
  );
  if (repositories.length < 1) {
    return next(error(404, "Repository not found on server"));
  }
  var repository = repositories[0];

  res.status(200).send(`Updating dataset ${id}.`);
  logger("get", "update", `Updating dataset ${id}.`);

  var name = repository.ssh.substring(repository.ssh.lastIndexOf("/") + 1).split(".")[0];
  var gitCommand = `cd git/${dataset.repositories_id}/${name} && git pull`;

  logger("get", "update", `Pulling repo ${repository.ssh}.`, (indent = 1));

  var code = await cmd(gitCommand);
  if (code !== 0) {
    logger("get", "update", `Failed to pull.`, (indent = 1));
  } else {
    logger("get", "update", `Completed pull.`, (indent = 1));
  }

  var bucket_path = `git/${dataset.repositories_id}/${name}/.bucket`;
  if (fs.existsSync(bucket_path)) {
    const bucket = fs.readFileSync(bucket_path, "utf8");
    logger(
      "get",
      "update",
      `Pulling data from bucket ${bucket}.`,
      (indent = 1)
    );

    var bucket_name = bucket.replace("https://", "").split(".")[0];
    var remote = repository.ssh.split("@")[1].split(".git", 1)[0].split(":");
    var host = remote[0];
    var group = remote[1].substring(0, remote[1].lastIndexOf("/"));
    var repository = remote[1].substring(remote[1].lastIndexOf("/") + 1);
    var parts = dataset.datasourcelink.split("/");
    var folder = `git/${dataset.repositories_id}/${parts
      .slice(0, parts.length - 1)
      .join("/")}`;
    var bucket_uri = `s3://${bucket_name}/${host}/${group}/${parts
      .slice(0, parts.length - 1)
      .join("/")}`;
    var command = `aws s3 sync ${bucket_uri} ${folder} --dryrun --delete --exact-timestamps`;

    output = [];
    var code = await cmd(command, (output = output));
    if (code !== 0) {
      logger(
        "get",
        "update",
        `Failed to perform s3 sync dry run`,
        (indent = 1)
      );
      return;
    }
    var file_download = [];
    var file_delete = [];
    for (var i = 0; i < output.length; i++) {
      output[i]
        .split("\n")
        .filter((o) => o.includes("dryrun"))
        .map((o) => {
          if (o.includes("download")) file_download.push(o.split(" to ")[1]);
          if (o.includes("delete")) file_delete.push(o.split("delete: ")[1]);
        });
    }

    var { rows: files } = await db.query(
      "SELECT * FROM files WHERE datasets_id = $1",
      [id]
    );

    var nc_files = files
      .filter((f) => f.filetype === "nc")
      .map((f) => f.filelink);

    var { rows: parameters } = await db.query(
      "SELECT * FROM datasetparameters WHERE datasets_id = $1",
      [id]
    );

    for (var i = 0; i < parameters.length; i++) {
      parameters[i]["rAxis"] = parameters[i].axis;
      parameters[i]["included"] = true;
    }

    if (file_download.length > 0 || file_delete.length > 0) {
      logger("get", "update", `Updating file list`, (indent = 1));
      try {
        await syncFileList(
          bucket_name,
          host,
          group,
          repository,
          dataset.repositories_id
        );
      } catch (e) {
        console.error(e);
      }

      var command = `aws s3 sync ${bucket_uri} ${folder} --delete --exact-timestamps`;
      var code = await cmd(command);
      if (code !== 0) {
        logger("get", "update", `Failed to perform s3 sync`, (indent = 1));
        return;
      }
      for (var i = 0; i < file_download.length; i++) {
        if (nc_files.includes(file_download[i])) {
          await modifyFileUpdate(
            file_download[i],
            files,
            parameters,
            dataset.fileconnect
          );
        } else {
          await addFileUpdate(
            id,
            file_download[i],
            parameters,
            dataset.fileconnect
          );
        }
      }
      for (var i = 0; i < file_delete.length; i++) {
        await removeFileUpdate(file_delete[i], files);
      }
    } else {
      logger("get", "update", `Local files already up to date.`, (indent = 1));
    }

    logger(
      "get",
      "update",
      `Checking local and global files match.`,
      (indent = 1)
    );

    var localFileList = fs.readdirSync(folder);
    localFileList = localFileList.filter((f) => f.endsWith('.nc'));
    localFileList = localFileList.map((f) => `${folder}/${f}`);
    var { rows: globalFileList } = await db.query(
      "SELECT * FROM files WHERE datasets_id = $1",
      [id]
    );

    var nc_globalFileList = globalFileList.filter((g) => g.filetype === "nc");
    var json_globalFileList = globalFileList.filter(
      (g) => g.filetype === "json"
    );

    var nc_globalNames = nc_globalFileList.map((f) => f.filelink);
    var json_globalLineage = json_globalFileList.map((f) => f.filelineage);

    for (var k = 0; k < localFileList.length; k++) {
      let duplicates = nc_globalFileList.filter(
        (gfl) => gfl.filelink === localFileList[k]
      );
      if (duplicates.length > 1) {
        for (let d = 0; d < duplicates.length; d++) {
          if (d !== 0) {
            removeFileUpdate(duplicates[d], files);
          }
        }
      }

      if (!nc_globalNames.includes(localFileList[k])) {
        addFileUpdate(id, localFileList[k], parameters, dataset.fileconnect);
      } else {
        var nc_globalfile = nc_globalFileList.filter(
          (f) => f.filelink === localFileList[k]
        )[0];
        if (!json_globalLineage.includes(nc_globalfile.id)) {
          modifyFileUpdate(
            localFileList[k],
            globalFileList,
            parameters,
            dataset.fileconnect
          );
        }
      }
    }
    for (var l = 0; l < nc_globalNames.length; l++) {
      if (!localFileList.includes(nc_globalNames[l])) {
        removeFileUpdate(nc_globalNames[l], globalFileList);
      }
    }
    logger("get", "update", `Update Complete.`, (indent = 1));
  } else {
    logger("get", "update", `No bucket file located.`, (indent = 1));
  }
});

syncFileList = async (bucket_name, host, group, repository, repo_id) => {
  const id = Math.floor(Math.random() * 10000000000);
  var prefix = `${host}/${group}/${repository}/data/`;
  const params = {
    Bucket: bucket_name,
    Prefix: prefix,
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
              allKeys.push({
                k: content.Key.replace(prefix, ""),
                s: content.Size,
              });
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
  fs.writeFileSync(`/tmp/filelist_${id}.json`, JSON.stringify(bucket_files));
  const fileStream = fs.createReadStream(`/tmp/filelist_${id}.json`);
  const uploadParams = {
    Bucket: bucket_name,
    Body: fileStream,
    Key: `${host}/${group}/${repository}/filelist.json`,
  };
  return s3.upload(uploadParams).promise();
};

const sendStatus = async (bucket, id, message) => {};

cmd = (command, output = []) => {
  let p = spawn(command, {
    shell: true,
  });
  return new Promise((resolveFunc) => {
    p.stdout.on("data", (x) => {
      output.push(x.toString());
    });
    p.stderr.on("data", (x) => {
      output.push(x.toString());
    });
    p.on("exit", (code) => {
      resolveFunc(code);
    });
  });
};

addFileUpdate = async (datasets_id, filelink, parameters, fileconnect) => {
  logger("get", "update", "Adding file: " + filelink, (indent = 2));
  if (filelink.slice(-3) !== ".nc") {
    logger(
      "post",
      "gitwebhook",
      "Failed to add non NetCDF file.",
      (indent = 3)
    );
    return;
  }
  var { rows: newfiles } = await db.query(
    "INSERT INTO files (datasets_id, filelink, filetype) VALUES ($1,$2,$3) RETURNING *",
    [datasets_id, filelink, "nc"]
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

modifyFileUpdate = async (filelink, files, parameters, fileconnect) => {
  logger("get", "update", "Modifying file: " + filelink, (indent = 2));
  var nc_file = files.filter((file) => file.filelink === filelink)[0];
  var json_file = files.find((file) => file.filelineage === nc_file.id);
  if (json_file) {
    // Delete json file from database
    await db.query("DELETE FROM files WHERE id = $1", [json_file.id]);
    // Delete json file
    if (fs.existsSync(json_file.filelink))
      await unlinkAsync(json_file.filelink);
  }

  // Create new file
  var url = creds.apiUrl + "/convert";
  var body = {
    id: nc_file.id,
    variables: parameters,
    fileconnect: fileconnect,
  };
  try {
    await axios.post(url, body);
  } catch (e) {
    console.error(e);
  }
};

removeFileUpdate = async (filelink, files) => {
  var nc_file = files.find((file) => file.filelink === filelink);
  if (nc_file) {
    logger("get", "update", "Removing file: " + filelink, (indent = 2));
    var json_file = files.find((file) => file.filelineage === nc_file.id);
    if (json_file) {
      if (fs.existsSync(json_file.filelink)) {
        await unlinkAsync(json_file.filelink);
      }
      await db.query("DELETE FROM files WHERE id = $1", [json_file.id]);
    }
    await db.query("DELETE FROM files WHERE id = $1", [nc_file.id]);
  }
};

module.exports = router;
