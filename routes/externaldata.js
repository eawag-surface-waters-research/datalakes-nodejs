const express = require("express");
const router = express.Router();
const axios = require("axios");
const https = require("https");
const format = require("pg-format");
const db = require("../db");
const fs = require("fs");
const path = require("path");
const { error, readDateTime, getDateOfWeek } = require("../functions");
const creds = require("../config");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

// S3 Connections
var AWS = require("aws-sdk");
AWS.config.setPromisesDependency();
var s3_rs = new AWS.S3({
  params: {
    Bucket: "eawagrs",
  },
});
var s3_simstrat = new AWS.S3({
  params: {
    Bucket: "eawag-simstrat",
  },
});

getS3BucketKeys = async (params, bucket, allKeys = []) => {
  const response = await bucket.listObjectsV2(params).promise();
  response.Contents.forEach((obj) => allKeys.push(obj.Key));

  if (response.NextContinuationToken) {
    params.ContinuationToken = response.NextContinuationToken;
    await getS3BucketKeys(params, bucket, allKeys);
  }
  return allKeys;
};

// Get data
const lakejson = require("../data/morphology/swisslakes.json");
var remotesensingapi = require("../data/swagger/remotesensingapi.json");

// Lake Morphology

router.get("/lakejson", async (req, res, next) => {
  res.status(200).send(lakejson);
});

router.get("/morphology/:id", async (req, res, next) => {
  var id = parseInt(req.params.id);
  var files = fs.readdirSync("data/morphology");
  files = files.map((f) => parseInt(f.replace(".csv", "")));
  if (files.includes(id)) {
    res.header("Content-Type", "application/json");
    res.sendFile(path.join(__dirname, `../data/morphology/${id}.json`));
  } else {
    return next(error(400, "ID not found"));
  }
});

// CH2018

var lakes = [
  {
    id: "Maggiore",
    name: "L. Maggiore",
    area: "212.51",
    altitude: "193",
    volume: "37",
  },
  {
    id: "Lower-Lugano",
    name: "Lower L. Lugano",
    area: "20.00",
    altitude: "271",
    volume: "1.14",
  },
  {
    id: "Upper-Lugano",
    name: "Upper L. Lugano",
    area: "27.30",
    altitude: "271",
    volume: "4.69",
  },
  {
    id: "Geneva",
    name: "L. Geneva",
    area: "582.21",
    altitude: "372",
    volume: "89",
  },
  {
    id: "Lower-Constance",
    name: "Lower L. Constance",
    area: "26.59",
    altitude: "395",
    volume: "0.8",
  },
  {
    id: "Upper-Constance",
    name: "Upper L. Constance",
    area: "481.72",
    altitude: "395",
    volume: "47.6",
  },
  {
    id: "Upper-Zurich",
    name: "Upper L. Zürich ",
    area: "20.30",
    altitude: "406",
    volume: "0.47",
  },
  {
    id: "Lower-Zurich",
    name: "Lower L. Zürich ",
    area: "66.60",
    altitude: "406",
    volume: "3.36",
  },
  {
    id: "Walen",
    name: "Walensee",
    area: "24.14",
    altitude: "419",
    volume: "2.5",
  },
  {
    id: "Rot",
    name: "Rotsee ",
    area: "0.47",
    altitude: "419",
    volume: "0.0038",
  },
  {
    id: "Biel",
    name: "L. Biel ",
    area: "39.30",
    altitude: "429",
    volume: "1.12",
  },
  {
    id: "Murten",
    name: "L. Murten",
    area: "23.00",
    altitude: "429",
    volume: "0.55",
  },
  {
    id: "Neuchatel",
    name: "L. Neuchâtel",
    area: "217.90",
    altitude: "429",
    volume: "13.77",
  },
  {
    id: "Lucerne-Alpnacher",
    name: "L. Alpnach",
    area: "4.76",
    altitude: "434",
    volume: "0.1",
  },
  {
    id: "Lucerne-Gersauer",
    name: "L. Lucerne, Gersauer Becken",
    area: "30.27",
    altitude: "434",
    volume: "4.41",
  },
  {
    id: "Lucerne-Kreuztrichter",
    name: "L. Lucerne, Kreuztrichter",
    area: "58.92",
    altitude: "434",
    volume: "4.35",
  },
  {
    id: "Lucerne-Urnersee",
    name: "L. Lucerne, Urnersee",
    area: "22.00",
    altitude: "434",
    volume: "3.16",
  },
  {
    id: "Greifen",
    name: "Greifensee ",
    area: "8.45",
    altitude: "435",
    volume: "0.15",
  },
  {
    id: "Pfaffikon",
    name: "Pfäffikersee",
    area: "3.20",
    altitude: "537",
    volume: "0.059",
  },
  {
    id: "Brienz",
    name: "L. Brienz",
    area: "29.80",
    altitude: "564",
    volume: "5.17",
  },
  {
    id: "Klontaler",
    name: "Klöntalersee ",
    area: "3.30",
    altitude: "848",
    volume: "0.056",
  },
  {
    id: "Poschiavo",
    name: "Lago di Poschiavo",
    area: "1.98",
    altitude: "962",
    volume: "0.12",
  },
  {
    id: "Joux",
    name: "Lac de Joux",
    area: "8.77",
    altitude: "1004",
    volume: "0.145",
  },
  {
    id: "LacdelHongrin",
    name: "Lac de l'Hongrin",
    area: "1.60",
    altitude: "1250",
    volume: "0.0532",
  },
  {
    id: "LakeDavos",
    name: "L. Davos",
    area: "0.59",
    altitude: "1558",
    volume: "0.0156",
  },
  {
    id: "Oeschinensee",
    name: "Oeschinensee",
    area: "1.16",
    altitude: "1578",
    volume: "0.0402",
  },
  {
    id: "StMoritz",
    name: "L. St. Moritz ",
    area: "0.78",
    altitude: "1768",
    volume: "0.02",
  },
  {
    id: "Silvaplana",
    name: "L. Silvaplana",
    area: "2.71",
    altitude: "1791",
    volume: "0.14",
  },
  {
    id: "Sils",
    name: "L. Sils",
    area: "4.11",
    altitude: "1797",
    volume: "0.137",
  },
];

router.get("/ch2018/lakes", async (req, res, next) => {
  res.status(200).send(lakes);
});

router.get("/ch2018/:lake", async (req, res, next) => {
  var lake = req.params.lake;
  if (lakes.map((l) => l.id).includes(lake)) {
    var dpath = `./data/ch2018/${lake}.json`;
    res.download(dpath, path.basename(dpath));
  } else {
    return next(error(400, "Lake not in list of lakes"));
  }
});

// Alplakes
var alplakes = {
  zurich: 11,
  geneva: 14,
  greifensee: 15,
  ageri: 10,
  biel: 9,
  caldonazzo: 8,
  garda: 7,
  hallwil: 6,
  joux: 5,
  lugano: 4,
  murten: 3,
  stmoritz: 2,
};

function parseAlplakesDateString(datetimeString) {
  const parts = datetimeString.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

router.get("/update/alplakes", async (req, res, next) => {
  var { data } = await axios.get(
    "https://alplakes-api.eawag.ch/simulations/metadata",
    { timeout: 2000, httpsAgent: agent }
  );
  data = data.find((d) => d.model === "delft3d-flow")["lakes"];
  for (var lake of data) {
    if (lake.name in alplakes) {
      try {
        let mindatetime = parseAlplakesDateString(lake["start_date"]);
        let maxdatetime = parseAlplakesDateString(lake["end_date"]);
        await db.query(
          "UPDATE files SET mindatetime = $1, maxdatetime = $2 WHERE datasets_id = $3",
          [mindatetime, maxdatetime, alplakes[lake.name]]
        );
        await db.query(
          "UPDATE datasets SET mindatetime = $1, maxdatetime = $2 WHERE id = $3",
          [mindatetime, maxdatetime, alplakes[lake.name]]
        );
      } catch (e) {}
    }
  }
  res.status(200).send("Success");
});

// Simstrat

getSimstrat = async () => {
  const { data } = await axios.get(
    "https://simstrat.eawag.ch/static/templates/simstrat.kml",
    { timeout: 2000 }
  );

  var lakes = data.split("</Placemark>");
  lakes.pop();

  var json = lakes.map((lake) => {
    var latlng = lake.match("<coordinates>(.*)</coordinates>")[1].split(" ");
    latlng = latlng.map((xyz) => {
      var ll = xyz.split(",");
      return [parseFloat(ll[1]), parseFloat(ll[0])];
    });
    return {
      link: lake.split(/href="|" target/)[1],
      value: parseFloat(lake.split(/Surface temperature: | °C/)[1]),
      elevation: parseFloat(lake.match("Elevation: (.*) m<br>")[1]),
      depth: parseFloat(lake.match("Depth: (.*) m")[1]),
      name: lake.match("target=_parent>(.*)</a></h5>")[1],
      latlng: latlng,
    };
  });
  fs.writeFile(
    "data/simstrat/simstratSurfaceTemperature.json",
    JSON.stringify(json)
  );

  await db
    .query(
      "UPDATE datasets SET mindatetime = $1, maxdatetime = $2 WHERE id = $3",
      [new Date(), new Date(), 10]
    )
    .catch((e) => {
      console.log(e);
    });
  await db
    .query(
      "UPDATE files SET mindatetime = $1, maxdatetime = $2 WHERE id = $3",
      [new Date(), new Date(), 4]
    )
    .catch((e) => {
      console.log(e);
    });
};

syncSimstrat = async (res, next) => {
  var remove = [];
  var add = [];

  var simstrat_id = 23;

  var files = await getS3BucketKeys(
    {
      Bucket: "eawag-simstrat",
    },
    s3_simstrat
  );

  files = [...new Set(files)];

  var { rows } = await db.query("SELECT * FROM files WHERE datasets_id = $1", [
    simstrat_id,
  ]);

  files = files.filter((f) => f.includes("T_") && f.includes(".json"));

  files = files.map((f) => {
    var fd = {};
    var dates = f.split("T_")[1].split(".json")[0].split("_");
    fd.url = "https://eawag-simstrat.s3.eu-central-1.amazonaws.com/" + f;
    fd.mindatetime = new Date(
      Date.UTC(
        parseInt(dates[0].substring(0, 4)),
        parseInt(dates[0].substring(4, 6)) - 1,
        parseInt(dates[0].substring(6, 8))
      )
    );
    fd.maxdatetime = new Date(
      Date.UTC(
        parseInt(dates[1].substring(0, 4)),
        parseInt(dates[1].substring(4, 6)) - 1,
        parseInt(dates[1].substring(6, 8))
      )
    );
    fd.unix = fd.maxdatetime.getTime();
    return fd;
  });

  rows = rows.map((r) => {
    r.unix = new Date(r.maxdatetime).getTime();
    return r;
  });

  files_unix = files.map((f) => f.unix);
  rows_unix = rows.map((r) => r.unix);

  rows.map((r) => {
    if (!files_unix.includes(r.unix)) {
      remove.push(r.id);
    }
  });

  files.map((f) => {
    if (!rows_unix.includes(f.unix)) {
      //datasets_id, filelink, filetype, mindatetime, maxdatetime, mindepth, maxdepth, latitude, longitude
      add.push([
        simstrat_id,
        f.url,
        "json",
        f.mindatetime,
        f.maxdatetime,
        0,
        0,
        -9999,
        -9999,
      ]);
    }
  });

  // Update Dataset mindatetime and maxdatetime
  var mindatetime = new Date(Math.min(...files_unix));
  var maxdatetime = new Date(Math.max(...files_unix));

  await db
    .query(
      "UPDATE datasets SET mindatetime = $1, maxdatetime = $2 WHERE id = $3",
      [mindatetime, maxdatetime, simstrat_id]
    )
    .catch((e) => {
      console.log(e);
    });

  // Add files
  if (add.length > 0) {
    var query = format(
      "INSERT INTO files (datasets_id, filelink, filetype, mindatetime, maxdatetime, mindepth, maxdepth, latitude, longitude) VALUES %L",
      add
    );
    await db.query(query).catch((e) => {
      return next(error(500, e));
    });
  }

  if (remove.length > 0) {
    var query = format("DELETE FROM files WHERE id IN (%L)", remove);
    await db.query(query).catch((e) => {
      return next(error(500, e));
    });
  }

  // Remove duplicates
  await db
    .query(
      "DELETE FROM files a USING files b WHERE a.datasets_id = $1 AND a.id < b.id AND a.filelink = b.filelink",
      [simstrat_id]
    )
    .catch((e) => {
      console.log(e);
    });

  var out = { add, remove };
  return out;
};

router.get("/simstrat", async (req, res, next) => {
  res.send(require("../data/simstrat/simstratSurfaceTemperature.json"));
});

router.get("/update/simstrat", async (req, res, next) => {
  await getSimstrat();
  res.status(200).send("Updated");
});

router.get("/sync/simstrat", async (req, res, next) => {
  var out = await syncSimstrat();
  res.status(200).send(out);
});

// Remote Sensing
var remotesensing = [
  { id: 19, name: "SECCHIDEPTH_Zsd_lee", url: "Zsd_lee" },
  { id: 20, name: "OC3_chla", url: "chla" },
  {
    id: 21,
    name: "POLYMER_tsm_binding754",
    url: "tsm_binding754",
  },
  {
    id: 22,
    name: "PRIMARYPRODUCTION_pp",
    url: "pp",
  },
  { id: 24, name: "WHITING_bgr_whit", url: "bgr_whit" },
  { id: 25, name: "WHITING_area_bgr", url: "area_bgr" },
];

parseDatetime = (name) => {
  var arr = name.split("_");
  var dt = arr[arr.length - 1].split(".")[0];
  return readDateTime(dt);
};

filterDirectory = (directory, keys, parameter) => {
  var files = keys.filter(
    (k) => k.includes(directory) && k.includes(parameter) && k.includes(".json")
  );
  files = files.map((f) => {
    var url = "https://eawagrs.s3.eu-central-1.amazonaws.com/" + f;
    var datetime = parseDatetime(f);
    var unix = datetime.getTime();
    return { url, datetime, unix };
  });
  return files;
};

syncRemoteSensing = async (res, next) => {
  var remove = [];
  var add = [];

  var allFiles = await getS3BucketKeys(
    {
      Bucket: "eawagrs",
    },
    s3_rs
  );

  allFiles = [...new Set(allFiles)];

  for (var i = 0; i < remotesensing.length; i++) {
    var { rows } = await db.query(
      "SELECT * FROM files WHERE datasets_id = $1",
      [remotesensing[i].id]
    );

    var files = filterDirectory(
      "datalakes/sui",
      allFiles,
      remotesensing[i].name
    );

    rows = rows.map((r) => {
      r.unix = new Date(r.mindatetime).getTime();
      return r;
    });
    files_unix = files.map((f) => f.unix);
    rows_unix = rows.map((r) => r.unix);

    rows.map((r) => {
      if (!files_unix.includes(r.unix)) {
        remove.push(r.id);
      }
    });

    files.map((f) => {
      if (!rows_unix.includes(f.unix)) {
        //datasets_id, filelink, filetype, mindatetime, maxdatetime, mindepth, maxdepth, latitude, longitude
        add.push([
          remotesensing[i].id,
          f.url,
          "json",
          f.datetime,
          f.datetime,
          0,
          0,
          -9999,
          -9999,
        ]);
      }
    });

    // Update Dataset mindatetime and maxdatetime
    var mindatetime = new Date(Math.min(...files_unix));
    var maxdatetime = new Date(Math.max(...files_unix));

    await db
      .query(
        "UPDATE datasets SET mindatetime = $1, maxdatetime = $2 WHERE id = $3",
        [mindatetime, maxdatetime, remotesensing[i].id]
      )
      .catch((e) => {
        console.log(e);
      });

    // Add files
    if (add.length > 0) {
      var query = format(
        "INSERT INTO files (datasets_id, filelink, filetype, mindatetime, maxdatetime, mindepth, maxdepth, latitude, longitude) VALUES %L",
        add
      );
      await db.query(query).catch((e) => {
        return next(error(500, e));
      });
    }

    if (remove.length > 0) {
      var query = format("DELETE FROM files WHERE id IN (%L)", remove);
      await db.query(query).catch((e) => {
        return next(error(500, e));
      });
    }

    // Remove duplicates
    await db
      .query(
        "DELETE FROM files a USING files b WHERE a.datasets_id = $1 AND a.id < b.id AND a.filelink = b.filelink",
        [remotesensing[i].id]
      )
      .catch((e) => {
        console.log(e);
      });
  }

  var out = { add, remove };
  res.status(201).send(out);
};

getNetCDF = (filelink) => {
  let path = filelink.split("/");
  let name = path.pop().split(".")[0];
  let name_path = name.split("_");
  let len = name_path.length;
  let folder = path.join("/");
  let nc = `${folder}/${name_path[0]}_${name_path[len - 2]}_${
    name_path[len - 1]
  }.nc`;
  let satellite = name_path[len - 2];
  return { nc, satellite };
};

router.get("/sync/remotesensing", async (req, res, next) => {
  syncRemoteSensing(res, next);
});

router.get("/remotesensing/api", async (req, res, next) => {
  res.status(200).send(remotesensingapi);
});

router.get("/remotesensing/datasets", async (req, res, next) => {
  var { rows } = await db.query(
    "SELECT id, title, description, maxdatetime, mindatetime FROM datasets WHERE title IS NOT NULL AND origin = 'satellite'"
  );
  rows.map((r) => {
    r["parameter"] = remotesensing.find((rs) => rs.id === r.id).url;
  });
  res.status(200).send(rows);
});

router.get("/remotesensing/files/:id", async (req, res, next) => {
  var id = req.params.id;
  if (!isInt(id)) {
    return next(error(400, "ID must be an integer"));
  }
  var { rows: drows } = await db.query(
    "SELECT * FROM datasets WHERE id = $1 and origin = 'satellite'",
    [id]
  );
  if (drows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  var parameter = remotesensing.find((rs) => rs.id === parseInt(id)).url;
  var { rows } = await db.query(
    "SELECT id, datasets_id, maxdatetime, filelink FROM files WHERE datasets_id = $1",
    [id]
  );
  if (rows.length < 1) {
    return next(error(404, "No files in the requested dataset"));
  }

  var out = [];
  for (let i = 0; i < rows.length; i++) {
    let datetime = new Date(rows[i].maxdatetime).getTime() / 1000;
    let { nc, satellite } = getNetCDF(rows[i].filelink);
    out.push({
      id: rows[i].id,
      datasets_id: rows[i].datasets_id,
      parameter: parameter,
      datetime: datetime,
      json: rows[i].filelink,
      nc: nc,
      satellite: satellite,
    });
  }
  res.status(200).send(out);
});

router.get("/remotesensing/json/:id", async (req, res, next) => {
  var id = req.params.id;

  var { rows } = await db.query(
    "SELECT datasets_id, filelink FROM files WHERE id = $1",
    [id]
  );

  if (rows.length !== 1) {
    return next(error(404, "Not a valid id"));
  }

  var { rows: datasets } = await db.query(
    "SELECT origin FROM datasets WHERE id = $1",
    [rows[0].datasets_id]
  );

  if (datasets.length !== 1) {
    return next(error(404, "Not a valid id"));
  }

  if (datasets[0].origin !== "satellite") {
    return next(error(404, "Not a valid id"));
  }

  let filelink = rows[0].filelink;
  let key = "datalakes/" + filelink.split("/datalakes/")[1];

  var params = {
    Bucket: "eawagrs",
    Key: key,
  };
  s3_rs.headObject(params, function (err, metadata) {
    if (err && err.code === "NotFound") {
      return next(error(404, "File not found"));
    } else {
      res.attachment(key);
      s3_rs.getObject(params).createReadStream().pipe(res);
    }
  });
});

router.get("/remotesensing/nc/:id", async (req, res, next) => {
  var id = req.params.id;

  var { rows } = await db.query(
    "SELECT datasets_id, filelink FROM files WHERE id = $1",
    [id]
  );

  if (rows.length !== 1) {
    return next(error(404, "Not a valid id"));
  }

  var { rows: datasets } = await db.query(
    "SELECT origin FROM datasets WHERE id = $1",
    [rows[0].datasets_id]
  );

  if (datasets.length !== 1) {
    return next(error(404, "Not a valid id"));
  }

  if (datasets[0].origin !== "satellite") {
    return next(error(404, "Not a valid id"));
  }

  let filelink = rows[0].filelink;
  var { nc } = getNetCDF(filelink);
  let key = "datalakes/" + nc.split("/datalakes/")[1];

  var params = {
    Bucket: "eawagrs",
    Key: key,
  };
  s3_rs.headObject(params, function (err, metadata) {
    if (err && err.code === "NotFound") {
      return next(error(404, "File not found"));
    } else {
      res.attachment(key);
      s3_rs.getObject(params).createReadStream().pipe(res);
    }
  });
});

module.exports = router;
