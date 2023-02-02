const db = require("./db");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { promisify } = require("util");
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const { spawn } = require("child_process");

now = () => {
  let d = new Date();
  let date = ("0" + d.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  return (
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds
  );
};

logger = (method, path, text, indent = 0) => {
  var space = " ";
  for (let i = 0; i < indent; i++) {
    space += "   ";
  }
  console.log(["(", method, ":", path, ":", now(), ")", space, text].join(""));
};

walk = async (dir, fileList = [], folderList = []) => {
  const files = await readDirAsync(dir);
  for (const file of files) {
    const stat = await statAsync(path.join(dir, file));
    if (stat.isDirectory()) {
      folderList.push(path.join(dir, file));
      out = await walk(path.join(dir, file), fileList, folderList);
      fileList = out[0];
      folderList = out[1];
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return [fileList, folderList];
};

isInt = (value) => {
  if (/^[-+]?(\d+|Infinity)$/.test(value)) {
    return true;
  } else {
    return false;
  }
};

unix2psqltime = (input) => {
  var datetime = new Date(input * 1000);
  return datetime;
};

checkObject = (attributes, dataset) => {
  var check = true;
  for (var attribute in attributes) {
    if (attribute in dataset) {
      if (attributes.attribute === "int" && !isInt(dataset.attribute)) {
        check = false;
      }
    } else {
      check = false;
    }
  }
  return check;
};

dataTypeVerification = async (tableName, input) => {
  try {
    var verified = true;
    var message = "";
    var output = {};
    const { rows } = await db.query(
      "select column_name,data_type from information_schema.columns where table_name = $1",
      [tableName]
    );
    for (row of rows) {
      if (row.column_name in input) {
        output[row.column_name] = input[row.column_name];
      } else {
        output[row.column_name] = null;
      }
    }
    return { verified: verified, output: output, message: message };
  } catch (err) {
    return { verified: false, output: {}, message: err.message };
  }
};

error = (code, message, description = "") => {
  let error = new Error(message);
  error.statusCode = code;
  error.description = description;
  return error;
};

parseUrl = (url) => {
  url = decodeURI(url);
  var ssh;
  var dir;
  var branch;
  var file;

  if (url.includes("https://")) {
    url = url.replace("/-/", "/");
    if (url.includes("renkulab.io/gitlab")) {
      var path = url.split("/blob/")[1].split("/");
      var loc = url.split("/blob/")[0].split("/");
      var repo = loc[loc.length - 1];
      branch = path[0];
      ssh =
        "git@renkulab.io:" +
        url.split("/blob/")[0].split("renkulab.io/gitlab/").pop() +
        ".git";
      dir = path.slice(1, path.length - 1);
      dir.unshift(repo);
      dir = dir.join("/");
      file = path[path.length - 1];
    }
  } else {
    var path = url.split("/");
    dir = path.slice(0, path.length - 1).join("/");
    file = path[path.length - 1];
  }

  return {
    ssh: ssh,
    dir: dir,
    branch: branch,
    file: file,
  };
};

parseSSH = (ssh) => {
  if (ssh.includes("git@renkulab.io")) {
    var folder = ssh.split(":")[1].split(".")[0];
    var url = "https://renkulab.io/gitlab/" + folder;
    return { url, folder };
  } else {
    return false;
  }
};

parseDateTime = (datetime) => {
  function addzero(val) {
    return (val > 9 ? "" : "0") + val;
  }
  var YYYY = datetime.getFullYear();
  var MM = addzero(datetime.getMonth() + 1);
  var DD = addzero(datetime.getDate());
  var hh = addzero(datetime.getUTCHours());
  var mm = addzero(datetime.getMinutes());
  var ss = addzero(datetime.getSeconds());
  return [YYYY, MM, DD, "T", hh, mm, ss].join("");
};

parseDate = (datetime) => {
  function addzero(val) {
    return (val > 9 ? "" : "0") + val;
  }
  var YYYY = datetime.getFullYear();
  var MM = addzero(datetime.getMonth() + 1);
  var DD = addzero(datetime.getDate());
  return [YYYY, MM, DD].join("");
};

readDateTime = (datetime) => {
  var YYYY = datetime.substring(0, 4);
  var MM = datetime.substring(4, 6);
  var DD = datetime.substring(6, 8);
  var hh = datetime.substring(9, 11);
  var mm = datetime.substring(11, 13);
  var ss = datetime.substring(13, 15);
  return new Date(
    YYYY + "-" + MM + "-" + DD + "T" + hh + ":" + mm + ":" + ss + "Z"
  );
};

readDate = (datetime) => {
  var YYYY = datetime.substring(0, 4);
  var MM = datetime.substring(4, 6);
  var DD = datetime.substring(6, 8);
  return new Date(YYYY + "-" + MM + "-" + DD);
};

compare = (a, b) => {
  a = new Date(a.maxdatetime).getTime();
  b = new Date(b.maxdatetime).getTime();
  if (a < b) {
    return 1;
  }
  if (a > b) {
    return -1;
  }
  return 0;
};

filterToDirectory = (directory, keys) => {
  var filter = keys.filter((k) => k.includes(directory) && k.includes(".json"));
  return filter.map((f) => {
    var arr = f.split("/");
    return arr[arr.length - 1];
  });
};

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

matlabTounix = (date) => {
  return (date - 719529) * 24 * 60 * 60;
};

unixToMatlab = (date) => {
  return 719529 + date / (24 * 60 * 60);
};

matlabToJavascriptDatetime = (date) => {
  return new Date((date - 719529) * 24 * 60 * 60 * 1000);
};

lineSegements = (x1, y1, x2, y2, n) => {
  var len = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  var arr = [...Array(n + 1).keys()];
  var x = arr.map((x) => x * (len / n));
  return { x, len };
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

getDateOfWeek = (w, y) => {
  var simple = new Date(y, 0, 1 + (w - 1) * 7, 0, 0, 0);
  var dow = simple.getDay();
  var ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

customRound = (value, dp) => {
  scale = 10 ** dp;
  return Math.round(value * scale) / scale;
};

module.exports = {
  isInt: isInt,
  unix2psqltime: unix2psqltime,
  checkObject: checkObject,
  walk: walk,
  dataTypeVerification: dataTypeVerification,
  error: error,
  parseUrl: parseUrl,
  parseSSH: parseSSH,
  parseDateTime: parseDateTime,
  parseDate: parseDate,
  readDateTime: readDateTime,
  readDate: readDate,
  compare: compare,
  filterToDirectory: filterToDirectory,
  closest: closest,
  matlabTounix: matlabTounix,
  unixToMatlab: unixToMatlab,
  matlabToJavascriptDatetime: matlabToJavascriptDatetime,
  lineSegements: lineSegements,
  coordsAlongLine: coordsAlongLine,
  findClosest: findClosest,
  rotate: rotate,
  mirror: mirror,
  getDateOfWeek: getDateOfWeek,
  customRound: customRound,
  logger: logger,
};
