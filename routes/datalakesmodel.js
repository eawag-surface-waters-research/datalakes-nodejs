const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const fs = require("fs");
const path = require("path");
const netcdf4 = require("netcdf4");
const {
  isInt,
  dataTypeVerification,
  unix2psqltime,
  error,
} = require("../functions");
var api = require("../data/swagger/datalakesmodelapi.json");

Date.prototype.getWeek = function (dowOffset) {
  dowOffset = typeof dowOffset == "int" ? dowOffset : 0;
  var newYear = new Date(this.getFullYear(), 0, 1);
  var day = newYear.getDay() - dowOffset;
  day = day >= 0 ? day : day + 7;
  var daynum =
    Math.floor(
      (this.getTime() -
        newYear.getTime() -
        (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) /
        86400000
    ) + 1;
  var weeknum;
  if (day < 4) {
    weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      nYear = new Date(this.getFullYear() + 1, 0, 1);
      nday = nYear.getDay() - dowOffset;
      nday = nday >= 0 ? nday : nday + 7;
      weeknum = nday < 4 ? 1 : 53;
    }
  } else {
    weeknum = Math.floor((daynum + day - 1) / 7);
  }
  return weeknum;
};

router.get("/layer/:lake/:datetime/:depth", (req, res, next) => {
  res.set("Content-Type", "application/json");
  var file = getFilePath(req.params.lake, req.params.datetime, res);
  res.json(getDatalakesLayer(file, req.params.datetime, -req.params.depth));
});

router.get("/transect/:lake/:datetime/:x/:y/", (req, res, next) => {
  res.set("Content-Type", "application/json");
  var file = getFilePath(req.params.lake, req.params.datetime, res);
  var x1 = req.params.x.split(",")[0]
  var x2 = req.params.x.split(",")[1]
  var y1 = req.params.y.split(",")[0]
  var y2 = req.params.y.split(",")[1]
  res.json(
    getDatalakesTransect(
      file,
      req.params.datetime,
      parseFloat(x1),
      parseFloat(y1),
      parseFloat(x2),
      parseFloat(y2)
    )
  );
});

router.get("/timeline/:lake/:datetime/:x/:y", (req, res, next) => {
  res.set("Content-Type", "application/json");
  var file = getFilePath(req.params.lake, req.params.datetime, res);
  let out = getDatalakesTimeline(file, req.params.x, req.params.y);
  if (out) {
    res.json(out);
  } else {
    return next(error(400, "Point outside of model boundary."));
  }
});

router.get("/depthprofile/:lake/:datetime/:x/:y", (req, res, next) => {
  res.set("Content-Type", "application/json");
  var file = getFilePath(req.params.lake, req.params.datetime, res);
  let out = getDatalakesDepthprofile(
    file,
    req.params.datetime,
    req.params.x,
    req.params.y
  );
  if (out) {
    res.json(out);
  } else {
    return next(error(400, "Point outside of model boundary."));
  }
});

router.get("/nc/:lake/:year/:week", (req, res, next) => {
  var file = getFilePathWeek(
    req.params.lake,
    req.params.year,
    req.params.week,
    next
  );
  if (file) {
    var filename = path.basename(file);
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
  } else {
    return next(error(400, "Datetime not valid."));
  }
});

router.get("/available", (req, res, next) => {
  var dir = "/storage/git/hydrodynamic-model/data";
  var files = fs.readdirSync(dir);
  files = files.filter((f) => f.includes(".nc") && f.includes("Datalakes_"));
  var data = {};
  for (var i = 0; i < files.length; i++) {
    let date = new Date(files[i].split("_")[1].split(".")[0]);
    let week = parseInt(date.getWeek());
    let year = date.getFullYear().toString();
    if (year in data) {
      data[year].push(week);
    } else {
      data[year] = [week];
    }
  }
  for (let year in data) {
    data[year] = data[year].sort((a, b) => a - b);
  }
  res.json([{ name: "Lake Geneva", data }]);
});

router.get("/api", (req, res, next) => {
  res.json(api);
});

function getFilePath(lake, date, res) {
  var dir = "/storage/git/hydrodynamic-model/data";
  var files = fs.readdirSync(dir);
  files = files.filter((f) => f.includes(".nc") && f.includes("Datalakes_"));
  var dates = files.map((f) =>
    new Date(f.split("_")[1].split(".")[0]).getTime()
  );
  var week = 7 * 24 * 60 * 60 * 1000;
  var min = Math.min(...dates);
  var max = Math.max(...dates) + week;
  if (date < min || date > max) {
    if (res === false) {
      return false;
    } else {
      res.json({ data: [], datetime: date / 1000, depth: 0 });
    }
  }

  for (var i = 0; i < dates.length; i++) {
    if (date >= dates[i] && date <= dates[i] + week) {
      return dir + "/" + files[i];
    }
  }
  if (res === false) {
    return false;
  } else {
    res.json({ data: [], datetime: date / 1000, depth: 0 });
  }
}

function getFilePathWeek(lake, year, week, next) {
  var dir = "/storage/git/hydrodynamic-model/data";
  var files = fs.readdirSync(dir);
  files = files.filter((f) => f.includes(".nc") && f.includes("Datalakes_"));
  var dates = files.map((f) =>
    new Date(f.split("_")[1].split(".")[0]).getTime()
  );
  var weekStart = getDateFromIsoweek(week, year, 1).getTime();
  var { index, value } = closest(weekStart, dates);
  if (Math.abs(value - weekStart) < 1000 * 60 * 60 * 24 * 3) {
    return dir + "/" + files[index];
  } else {
    return next(error(400, "Invalid year or week specified"));
  }
}

function getDatalakesLayer(file, datetime, depth) {
  // Open file
  var nc = new netcdf4.File(file, "r");

  // Get dimension lengths
  var T = nc.root.dimensions["Time"].length;
  var K = nc.root.dimensions["Z"].length;
  var M = nc.root.dimensions["Y"].length;
  var N = nc.root.dimensions["X"].length;

  // Get timesteps
  var datetimes = Object.values(nc.root.variables["Time"].readSlice(0, T));
  var { index: dtindex, value: dtvalue } = closest(datetime / 1000, datetimes);

  // Get depths
  var depths = Object.values(nc.root.variables["Z"].readSlice(0, K));
  var { index: depthindex, value: depthvalue } = closest(depth, depths);

  // Get min and max values for temperature
  var Temp = Object.values(
    nc.root.variables["Temp"].readSlice(0, T, depthindex, 1, 0, M, 0, N)
  ).filter((f) => !isNaN(f));
  var maxTemp = Math.max(...Temp);
  var minTemp = Math.min(...Temp);

  // Iterate to make array
  var data = [];
  var x, y, z, u, v;
  for (var i = 0; i < M; i++) {
    data.push([]);
    for (var j = 0; j < N; j++) {
      x = Object.values(nc.root.variables["SGx"].readSlice(i, 1, j, 1))[0];
      y = Object.values(nc.root.variables["SGy"].readSlice(i, 1, j, 1))[0];
      z = Object.values(
        nc.root.variables["Temp"].readSlice(
          dtindex,
          1,
          depthindex,
          1,
          i,
          1,
          j,
          1
        )
      )[0];
      u = Object.values(
        nc.root.variables["U"].readSlice(dtindex, 1, depthindex, 1, i, 1, j, 1)
      )[0];
      v = Object.values(
        nc.root.variables["V"].readSlice(dtindex, 1, depthindex, 1, i, 1, j, 1)
      )[0];
      if (x === 0 || y === 0 || isNaN(z) || isNaN(u) || isNaN(v)) {
        data[i].push(null);
      } else {
        data[i].push([
          x,
          y,
          Math.round(z * 100) / 100,
          Math.round(u * 100) / 100,
          Math.round(v * 100) / 100,
        ]);
      }
    }
  }

  nc.close();
  return { data, datetime: dtvalue, depth: depthvalue, minTemp, maxTemp };
}

function getDatalakesTransect(file, datetime, x1, y1, x2, y2) {
  // Logic on which file based on lake and datetime
  var nc = new netcdf4.File(file, "r");

  // Get dimension lengths
  var T = nc.root.dimensions["Time"].length;
  var K = nc.root.dimensions["Z"].length;
  var M = nc.root.dimensions["Y"].length;
  var N = nc.root.dimensions["X"].length;

  // Get timesteps
  var datetimes = Object.values(nc.root.variables["Time"].readSlice(0, T));
  var { index: dtindex, value: dtvalue } = closest(datetime / 1000, datetimes);

  var xx = Object.values(nc.root.variables["SGx"].readSlice(0, M, 0, N));
  var yy = Object.values(nc.root.variables["SGy"].readSlice(0, M, 0, N));

  // Create axis
  var { x, len } = lineSegements(x1, y1, x2, y2, 10);
  var y = Object.values(nc.root.variables["Z"].readSlice(0, K));

  // Get indexes
  var idx = [];
  var xin, yin;
  for (var i = 0; i < x.length; i++) {
    ({ x: xin, y: yin } = coordsAlongLine(x[i], len, x1, y1, x2, y2));
    idx.push(findClosest(xx, yy, xin, yin, M, N));
  }

  var z = [];
  var z1 = [];
  for (var j = 0; j < idx.length; j++) {
    if (idx[j].diff < 1000) {
      var zz = Object.values(
        nc.root.variables["Temp"].readSlice(
          dtindex,
          1,
          0,
          K,
          idx[j].ypix,
          1,
          idx[j].xpix,
          1
        )
      );
      zz = zz.map((l) => (l === -999 ? NaN : l));
      var zz1 = Object.values(
        nc.root.variables["U"].readSlice(
          dtindex,
          1,
          0,
          K,
          idx[j].ypix,
          1,
          idx[j].xpix,
          1
        )
      );
      var zz2 = Object.values(
        nc.root.variables["V"].readSlice(
          dtindex,
          1,
          0,
          K,
          idx[j].ypix,
          1,
          idx[j].xpix,
          1
        )
      );
      var zz3 = [];
      for (var i = 0; i < zz1.length; i++) {
        if (Math.abs(zz1[i]) > 10 || Math.abs(zz2[i]) > 10) {
          zz3.push(NaN);
        } else {
          zz3.push(Math.sqrt(zz1[i] ** 2 + zz2[i] ** 2));
        }
      }
    } else {
      zz = Array(K).fill(NaN);
      zz3 = Array(K).fill(NaN);
    }
    z.push(zz);
    z1.push(zz3);
  }
  nc.close();
  z = rotate(z);
  z = mirror(z);
  z1 = rotate(z1);
  z1 = mirror(z1);
  return { x, y, z, z1 };
}

function getDatalakesTimeline(file, xin, yin) {
  var nc = new netcdf4.File(file, "r");

  // Get dimension lengths
  var T = nc.root.dimensions["Time"].length;
  var K = nc.root.dimensions["Z"].length;
  var M = nc.root.dimensions["Y"].length;
  var N = nc.root.dimensions["X"].length;

  // Get timesteps
  var x = Object.values(nc.root.variables["Time"].readSlice(0, T));

  // Get depths
  var y = Object.values(nc.root.variables["Z"].readSlice(0, K));
  var xx = Object.values(nc.root.variables["SGx"].readSlice(0, M, 0, N));
  var yy = Object.values(nc.root.variables["SGy"].readSlice(0, M, 0, N));

  var { xpix, ypix, diff } = findClosest(xx, yy, xin, yin, M, N);
  if (diff < 1000) {
    var zz = Object.values(
      nc.root.variables["Temp"].readSlice(0, T, 0, K, ypix, 1, xpix, 1)
    );

    // Check in boundary
    if (zz.every((e) => e === null)) {
      nc.close();
      return false;
    }

    var z = [];
    while (zz.length) z.push(zz.splice(0, K));

    var zz1 = Object.values(
      nc.root.variables["U"].readSlice(0, T, 0, K, ypix, 1, xpix, 1)
    );
    var zz2 = Object.values(
      nc.root.variables["V"].readSlice(0, T, 0, K, ypix, 1, xpix, 1)
    );

    var zz3 = [];
    for (var i = 0; i < zz1.length; i++) {
      if (Math.abs(zz1[i]) > 10 || Math.abs(zz1[i]) > 10) {
        zz3.push(NaN);
      } else {
        zz3.push(Math.sqrt(zz1[i] ** 2 + zz2[i] ** 2));
      }
    }
    var z1 = [];
    while (zz3.length) z1.push(zz3.splice(0, K));

    nc.close();
    z = rotate(z);
    z1 = rotate(z1);
    return { x, y, z, z1 };
  } else {
    nc.close();
    return false;
  }
}

function getDatalakesDepthprofile(file, datetime, xin, yin) {
  // Logic on which file based on lake and datetime
  var nc = new netcdf4.File(file, "r");

  // Get dimension lengths
  var T = nc.root.dimensions["Time"].length;
  var K = nc.root.dimensions["Z"].length;
  var M = nc.root.dimensions["Y"].length;
  var N = nc.root.dimensions["X"].length;

  // Get timesteps
  var datetimes = Object.values(nc.root.variables["Time"].readSlice(0, T));
  var { index: dtindex, value: dtvalue } = closest(datetime / 1000, datetimes);

  //if (Math.abs(datetime - dtvalue) > 0.05) {
  //  return next(error(404, "Datetime not available"));
  //}

  // Get depths
  var y = Object.values(nc.root.variables["Z"].readSlice(0, K));
  var xx = Object.values(nc.root.variables["SGx"].readSlice(0, M, 0, N));
  var yy = Object.values(nc.root.variables["SGy"].readSlice(0, M, 0, N));

  var { xpix, ypix, diff } = findClosest(xx, yy, xin, yin, M, N);

  if (diff < 1000) {
    var x = Object.values(
      nc.root.variables["Temp"].readSlice(dtindex, 1, 0, K, ypix, 1, xpix, 1)
    );

    // Check in boundary
    if (x.every((e) => e === null)) {
      nc.close();
      return false;
    }

    var xx1 = Object.values(
      nc.root.variables["U"].readSlice(dtindex, 1, 0, K, ypix, 1, xpix, 1)
    );
    var xx2 = Object.values(
      nc.root.variables["V"].readSlice(dtindex, 1, 0, K, ypix, 1, xpix, 1)
    );
    var x1 = [];
    for (var i = 0; i < xx1.length; i++) {
      if (xx1[i] === -999 || xx1[i] === -999) {
        x1.push(NaN);
      } else {
        var out = Math.sqrt(xx1[i] ** 2 + xx2[i] ** 2);
        if (out < 10) {
          x1.push(out);
        } else {
          x1.push(NaN);
        }
      }
    }
    nc.close();
    return { x, x1, y };
  } else {
    nc.close();
    return false;
  }
}

closest = (num, arr) => {
  var index = 0;
  var value = arr[0];
  var diff = Math.abs(num - value);
  for (var val = 0; val < arr.length; val++) {
    var newdiff = Math.abs(num - arr[val]);
    if (newdiff < diff) {
      diff = newdiff;
      value = arr[val];
      index = val;
    }
  }
  return { index, value };
};

coordsAlongLine = (seg, len, x1, y1, x2, y2) => {
  var perc = seg / len;
  var x = x1 + (x2 - x1) * perc;
  var y = y1 + (y2 - y1) * perc;
  return { x, y };
};

findClosest = (x, y, xin, yin, M, N) => {
  var diff = Infinity;
  var index = 0;
  for (var k = 0; k < x.length; k++) {
    var newdiff = Math.sqrt(
      Math.abs(xin - x[k]) ** 2 + Math.abs(yin - y[k]) ** 2
    );
    if (newdiff < diff) {
      diff = newdiff;
      index = k;
    }
  }
  var ypix = Math.floor(index / N);
  var xpix = index - ypix * N;
  return { xpix, ypix, diff };
};

rotate = (matrix) => {
  let result = [];
  for (let i = 0; i < matrix[0].length; i++) {
    let row = matrix.map((e) => e[i]).reverse();
    result.push(row);
  }
  return result;
};

mirror = (matrix) => {
  return matrix.map((arr) => arr.reverse());
};

getDateFromIsoweek = (isoweek, year, day) => {
  var simple = new Date(year, 0, 1 + (isoweek - 1) * 7, 3);
  var dow = simple.getDay();
  var ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return new Date(ISOweekStart.setDate(ISOweekStart.getDate() + (day - 1)));
};

module.exports = router;
