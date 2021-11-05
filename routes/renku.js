const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const db = require("../db");
const fs = require("fs");
const zip = require("express-zip");
const { error } = require("../functions");

router.get("/:url", async (req, res, next) => {
  const url = req.params.url;
  var file = "";
  var dir = "";

  if (url.includes("renkulab.io/gitlab")) {
    // Parse url into parameters
    const path = url.split("/blob/")[1].split("/");
    const branch = path[0];
    file = path[path.length - 1];
    dir = path.slice(1, path.length - 1).join("/");
    var projectPath = url.split("/blob/")[0].split("renkulab.io/gitlab/");
    projectPath = projectPath[projectPath.length - 1];
    var filePath = dir + "/" + file;

    var query = {
      operationName: "getLineage",
      variables: {
        projectPath: projectPath,
        filePath: filePath,
      },
      query:
        "query getLineage($projectPath: ProjectPath!, $filePath: FilePath!) {  lineage(projectPath: $projectPath, filePath: $filePath) { nodes { id label type location __typename } edges { source target __typename } __typename }}",
    };

    // Get lineage info from renku api
    try {
      var { data } = await axios.post(
        "https://renkulab.io/knowledge-graph/graphql",
        query
      );
    } catch (e){
      res.status(204).send("Not a Renku repository");
    }
    res.status(200).send(data);
  } else {
    res.status(204).send("Not a Renku repository");
  }
});

router.post("/", async (req, res, next) => {
  var infile = req.body;
  const { url } = infile;
  var file = "";
  var dir = "";

  if (url.includes("renkulab.io/gitlab")) {
    // Parse url into parameters
    const path = url.split("/blob/")[1].split("/");
    const branch = path[0];
    file = path[path.length - 1];
    dir = path.slice(1, path.length - 1).join("/");
    var projectPath = url.split("/blob/")[0].split("renkulab.io/gitlab/");
    projectPath = projectPath[projectPath.length - 1];
    var filePath = dir + "/" + file;

    var query = {
      operationName: "getLineage",
      variables: {
        projectPath: projectPath,
        filePath: filePath,
      },
      query:
        "query getLineage($projectPath: ProjectPath!, $filePath: FilePath!) {  lineage(projectPath: $projectPath, filePath: $filePath) { nodes { id label type location __typename } edges { source target __typename } __typename }}",
    };

    // Get lineage info from renku api
    try {
      var { data } = await axios.post(
        "https://renkulab.io/knowledge-graph/graphql",
        query
      );
    } catch (e){
      res.status(204).send("Not a Renku repository");
    }
    res.status(200).send(data);
  } else {
    res.status(204).send("Not a Renku repository");
  }
});

router.get("/script/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM datasets WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  // https://renkulab.io/gitlab/lexplore/meteostation/blob/master/scripts/Level0_1A/01A00001_LexploreMeteostation_v2.py
  var url = rows[0].prescript;
  if (url.includes("renkulab.io/gitlab")) {
    // Parse url into parameters
    const path = url.split("/blob/")[1].split("/");
    file = path[path.length - 1];
    dir = path.slice(1, path.length - 1).join("/");
    var projectPath = url.split("/blob/")[0].split("renkulab.io/gitlab/");
    projectPath = projectPath[projectPath.length - 1];
    var filePath = dir + "/" + file;
    var fileDir =
      "git/" +
      rows[0].repositories_id +
      "/" +
      projectPath.split("/")[1] +
      "/" +
      filePath;
    fs.readFile(fileDir, (err, data) => {
      if (err) {
        console.log(err);
        return next(error(500, "Failed to read file"));
      }
      res.status(200).send(data);
    });
  } else {
    res.status(204).send("Not a Renku repository");
  }
});

router.get("/lineage/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows } = await db.query("SELECT * FROM datasets WHERE id = $1", [id]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  var url = rows[0].datasourcelink;
  if (url.includes("renkulab.io/gitlab")) {
    // Parse url into parameters
    const path = url.split("/blob/")[1].split("/");
    const branch = path[0];
    file = path[path.length - 1];
    dir = path.slice(1, path.length - 1).join("/");
    var projectPath = url.split("/blob/")[0].split("renkulab.io/gitlab/");
    projectPath = projectPath[projectPath.length - 1];
    var filePath = dir + "/" + file;

    var query = {
      operationName: "getLineage",
      variables: {
        projectPath: projectPath,
        filePath: filePath,
      },
      query:
        "query getLineage($projectPath: ProjectPath!, $filePath: FilePath!) {  lineage(projectPath: $projectPath, filePath: $filePath) { nodes { id label type location __typename } edges { source target __typename } __typename }}",
    };

    // Get lineage info from renku api
    try {
      var { data } = await axios.post(
        "https://renkulab.io/knowledge-graph/graphql",
        query
      );
    } catch (e){
      res.status(204).send("Not a Renku repository");
    }

    var { edges } = data.data.lineage;
    var filedir =
      "git/" + rows[0].repositories_id + "/" + projectPath.split("/")[1] + "/";
    var zipFile = [];
    zipFile = addZipFile(zipFile, filedir, filePath);
    var i = 1;
    var j = 0;
    while (i < 30 && j === 0) {
      var edge = filterEdges(edges, filePath);
      if (edge.length === 0) {
        j = 1;
      } else if (edge.length === 1) {
        if (edge[0].source.includes("cwl")) {
          edge = filterEdges(edges, edge[0].source);
          var { escript, edataset } = findScriptDataset(edge);
          zipFile = addZipFile(zipFile, filedir, escript.source);
          zipFile = addZipFile(zipFile, filedir, edataset.source);
          filePath = edataset.source;
        }
      } else if (edge.length > 1) {
        j = 1;
      }
      i++;
    }

    // Add readme and requirements.txt
    zipFile = addZipFile(zipFile, filedir, "requirements.txt");
    zipFile = addZipFile(zipFile, filedir, "README.md");

    if (zipFile.length > 0) {
      res.status(200).zip(zipFile);
    } else {
      res.status(200).send("No files found");
    }
  } else {
    res.status(204).send("Not a Renku repository");
  }
});

filterEdges = (edges, id) => {
  return edges.filter((e) => e.target === id);
};

findScriptDataset = (edges) => {
  var escript = edges.find((e) => {
    return ["py", "r"].includes(e.source.split(".")[1]);
  });
  var edataset = edges.find((e) => e.source !== escript.source);
  return { escript, edataset };
};

fileName = (name) => {
  var arr = name.split("/");
  return arr[arr.length - 1];
};

addZipFile = (zipFile, filedir, filePath) => {
  var path = filedir + filePath;
  var name = fileName(filePath);

  // Check file exists
  if (fs.existsSync(path)) {
    zipFile.push({ path, name });
  }
  return zipFile;
};

module.exports = router;
