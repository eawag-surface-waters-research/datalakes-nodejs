const Router = require("express-promise-router");
const router = new Router();
const db = require("../db");
const netcdf4 = require("netcdf4");
const fs = require("fs");
const { promisify } = require("util");
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const { isInt, error } = require("../functions");
const { CostExplorer } = require("aws-sdk");

getMax = (arr) => {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
};

getMin = (arr) => {
  let len = arr.length;
  let min = Infinity;

  while (len--) {
    min = arr[len] < min ? arr[len] : min;
  }
  return min;
};

getAve = (arr) => {
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length || 0;
};

allEqual = (arr) => {
  return arr.every((v) => v === arr[0]);
};

uniformNaNvalue = (arr) => {
  return arr.map((a) => (a > 10e30 || a === null || a === -9999 ? NaN : a));
};

matlabToUnix = (date) => {
  return (date - 719529) * 24 * 60 * 60;
};

parseTime = (arr, id) => {
  if (id === 1) {
    // If Matlab time
    if (arr[0] < 31536000) {
      arr = arr.map((a) => matlabToUnix(a));
    }
    return arr;
  } else {
    return arr;
  }
};

ss_parseNC = (filelink, variables) => {
  var nc = new netcdf4.File(filelink, "r");
  var length0;
  var length1;
  var ndims;
  var outdata = {};
  var data = {};
  var out = {
    mindatetime: -9999,
    maxdatetime: -9999,
    mindepth: 0,
    maxdepth: 0,
    longitude: -9999,
    latitude: -9999,
  };

  for (variable of variables) {
    ndims = nc.root.variables[variable.parseparameter].dimensions.length;
    length0 = nc.root.variables[variable.parseparameter].dimensions[0].length;

    if (ndims === 1) {
      data[variable.parameters_id] = parseTime(
        uniformNaNvalue(
          Object.values(
            nc.root.variables[variable.parseparameter].readSlice(0, length0)
          )
        ),
        variable.parameters_id
      );
      if (variable.included) {
        outdata[variable.rAxis] = parseTime(
          uniformNaNvalue(
            Object.values(
              nc.root.variables[variable.parseparameter].readSlice(0, length0)
            )
          ),
          variable.parameters_id
        );
      }
    } else if (ndims === 2) {
      length1 = nc.root.variables[variable.parseparameter].dimensions[1].length;
      data[variable.parameters_id] = uniformNaNvalue(
        Object.values(
          nc.root.variables[variable.parseparameter].readSlice(
            0,
            length0,
            0,
            length1
          )
        )
      );
      if (variable.included) {
        // Find which dimension to iterate over (want to iterate over y)
        var iterdim = variables.find((v) => v.axis === "y").parseparameter;
        var index = nc.root.variables[
          variable.parseparameter
        ].dimensions.findIndex((item) => item.name === iterdim);
        var arr = [];
        if (index === 0) {
          for (var i = 0; i < length0; i++) {
            arr.push(
              uniformNaNvalue(
                Object.values(
                  nc.root.variables[variable.parseparameter].readSlice(
                    i,
                    1,
                    0,
                    length1
                  )
                )
              )
            );
          }
        } else {
          for (var i = 0; i < length1; i++) {
            arr.push(
              uniformNaNvalue(
                Object.values(
                  nc.root.variables[variable.parseparameter].readSlice(
                    0,
                    length0,
                    i,
                    1
                  )
                )
              )
            );
          }
        }
        outdata[variable.rAxis] = arr;
      }
    } else {
      return next(
        error(400, "Logic not available for parsing more than 2 dimensions")
      );
    }

    // Logic for parsing key parameters from nc file
    if (variable.parameters_id === 1) {
      // Time
      out["mindatetime"] = getMin(data[variable.parameters_id]);
      out["maxdatetime"] = getMax(data[variable.parameters_id]);
    } else if (variable.parameters_id === 2) {
      // Depth
      if (!variable.included) {
        out["mindepth"] = getMin(data[variable.parameters_id]);
        out["maxdepth"] = getMax(data[variable.parameters_id]);
      } else if (allEqual(data[variable.parameters_id])) {
        out["mindepth"] = data[variable.parameters_id][0];
        out["maxdepth"] = data[variable.parameters_id][0];
      } else if (length0 > 1) {
        out["mindepth"] = getMin(data[variable.parameters_id]);
        out["maxdepth"] = getMax(data[variable.parameters_id]);
      } else {
        out["mindepth"] = data[variable.parameters_id][0];
        out["maxdepth"] = data[variable.parameters_id][0];
      }
    } else if (variable.parameters_id === 3) {
      //Longitude
      if (length0 === 0) {
        out["longitude"] = data[variable.parameters_id][0];
      }
    } else if (variable.parameters_id === 4) {
      // Latitude
      if (length0 === 0) {
        out["latitude"] = data[variable.parameters_id][0];
      }
    }
  }
  return { out: out, output: JSON.stringify(outdata) };
};

keyParameters = (out, arr, id) => {
  try {
    if (id === 1) {
      // Time
      out["mindatetime"] = getMin(arr);
      out["maxdatetime"] = getMax(arr);
    } else if (id === 2) {
      out["mindepth"] = getMin(arr);
      out["maxdepth"] = getMax(arr);
    } else if (variable.parameters_id === 3) {
      out["longitude"] = arr[0];
    } else if (variable.parameters_id === 4) {
      out["latitude"] = arr[0];
    }
  } catch (e) {
    console.error(e);
    console.error("Failed to parse key parameter");
  }
  return out;
};

checkNumeric = (value) => {
  if (isNaN(value) || value === Infinity || value === -Infinity) {
    return null;
  } else {
    return value;
  }
};

listMatch = (l1, l2) => {
  for (let i in l1) {
    if (l2.includes(i.toLowerCase())) {
      return i;
    }
  }
  return false;
};

parseNC = (filelink, variables) => {
  var nc = new netcdf4.File(filelink, "r");
  var outdata = {};
  var out = {
    mindatetime: -9999,
    maxdatetime: -9999,
    mindepth: 0,
    maxdepth: 0,
    longitude: -9999,
    latitude: -9999,
  };

  const lat = listMatch(nc.root.attributes, ["lat", "latitude"]);
  if (lat) {
    try {
      let latitudeValue = parseFloat(nc.root.attributes[lat].value);
      if (
        latitudeValue !== NaN &&
        latitudeValue >= -90 &&
        latitudeValue <= 90
      ) {
        out.latitude = latitudeValue;
      }
    } catch (e) {
      console.log("Failed to parse latitude");
    }
  }

  const lng = listMatch(nc.root.attributes, ["lng", "lon", "longitude"]);
  if (lng) {
    try {
      let longitudeValue = parseFloat(nc.root.attributes[lng].value);
      if (
        longitudeValue !== NaN &&
        longitudeValue >= -180 &&
        longitudeValue <= 180
      ) {
        out.longitude = longitudeValue;
      }
    } catch (e) {
      console.log("Failed to parse longitude");
    }
  }

  const time = listMatch(nc.root.attributes, [
    "time",
    "datetime",
    "unix",
    "unix time",
    "unix datetime",
    "date",
  ]);
  if (time) {
    try {
      let timeValue = parseFloat(nc.root.attributes[time].value);
      if (timeValue !== NaN && timeValue > 0) {
        out.mindatetime = timeValue;
        out.maxdatetime = timeValue;
      }
    } catch (e) {
      console.log("Failed to parse time");
    }
  }

  const depth = listMatch(nc.root.attributes, ["depth"]);
  if (depth) {
    try {
      let depthValue = parseFloat(nc.root.attributes[depth].value);
      if (depthValue !== NaN && depthValue > 0) {
        out.mindepth = depthValue;
        out.maxdepth = depthValue;
      }
    } catch (e) {
      console.log("Failed to parse depth");
    }
  }

  for (variable of variables) {
    if (["M", "x", "y"].includes(variable.axis.replace(/[0-9]/g, ""))) {
      if (variable.parseparameter in nc.root.variables) {
        let dims = nc.root.variables[variable.parseparameter].dimensions;
        let dimarr = [];
        for (dim of dims) {
          dimarr.push(0);
          dimarr.push(dim.length);
        }
        outdata[variable.rAxis] = parseTime(
          uniformNaNvalue(
            Object.values(
              nc.root.variables[variable.parseparameter].readSlice(...dimarr)
            )
          ),
          variable.parameters_id
        );
        out = keyParameters(
          out,
          outdata[variable.rAxis],
          variable.parameters_id
        );
      } else {
        outdata[variable.rAxis] = [];
      }
    } else if (variable.axis.replace(/[0-9]/g, "") === "z") {
      if (variable.parseparameter in nc.root.variables) {
        let dims = nc.root.variables[variable.parseparameter].dimensions;
        let dimnames = dims.map((d) => d.name);
        let xparam = variables.filter(
          (v) => v.axis === "x" && dimnames.includes(v.parseparameter)
        )[0];
        let yparam = variables.filter(
          (v) => v.axis === "y" && dimnames.includes(v.parseparameter)
        )[0];
        let xdim = dims.find((d) => d.name === xparam.parseparameter);
        let ydim = dims.find((d) => d.name === yparam.parseparameter);

        var arr = [];
        try {
          let dimarr = [];
          for (dim of dims) {
            if (dim === xdim) {
              dimarr.push(0);
              dimarr.push(xdim.length);
            } else if (dim === ydim) {
              dimarr.push(0);
              dimarr.push(ydim.length);
            } else {
              dimarr.push(0);
              dimarr.push(dim.length);
            }
          }
          var read = uniformNaNvalue(
            Object.values(
              nc.root.variables[variable.parseparameter].readSlice(...dimarr)
            )
          );
          while (read.length) arr.push(read.splice(0, dimarr[3]));
          if (arr.length !== ydim.length) {
            arr = arr[0].map((_, colIndex) => arr.map((row) => row[colIndex]));
          }
        } catch (e) {
          for (let i = 0; i < ydim.length; i++) {
            let row = [];
            for (let j = 0; j < xdim.length; j++) {
              let dimarr = [];
              for (dim of dims) {
                if (dim === xdim) {
                  dimarr.push(j);
                  dimarr.push(1);
                } else if (dim === ydim) {
                  dimarr.push(i);
                  dimarr.push(1);
                } else {
                  dimarr.push(0);
                  dimarr.push(dim.length);
                }
              }
              row.push(
                parseTime(
                  uniformNaNvalue(
                    Object.values(
                      nc.root.variables[variable.parseparameter].readSlice(
                        ...dimarr
                      )
                    )
                  ),
                  variable.parameters_id
                )[0]
              );
            }
            arr.push(row);
          }
        }
        outdata[variable.rAxis] = arr;
      } else {
        outdata[variable.rAxis] = [[]];
      }
    }
  }
  return { out: out, output: JSON.stringify(outdata) };
};

router.post("/", async (req, res, next) => {
  const { id: inFile_id, variables, fileconnect } = req.body;
  if (!isInt(inFile_id)) {
    return next(error(400, "ID must be an integer"));
  }

  // Get file information
  var { rows } = await db.query("SELECT * FROM files WHERE id = $1", [
    inFile_id,
  ]);
  if (rows.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  var { datasets_id, filetype, filelink } = rows[0];
  var { rows: dataset } = await db.query(
    "SELECT * FROM datasets WHERE id = $1",
    [datasets_id]
  );
  if (dataset.length < 1) {
    return next(error(404, "Dataset not found in database"));
  }
  dataset = dataset[0];

  // Add new file to database and get new ID and link
  var { rows } = await db.query(
    "INSERT INTO files (filelink) VALUES ($1) RETURNING *",
    [null]
  );
  const new_id = rows[0].id;
  const new_link = "files/" + datasets_id + "/" + new_id + ".json";

  if (filetype === "nc") {
    // try {
    var { out, output } = parseNC(filelink, variables);
    // } catch (e) {
    //   console.error("New parse failed - trying old parse");
    //   var { out, output } = ss_parseNC(filelink, variables);
    // }

    var { mindatetime, maxdatetime, mindepth, maxdepth, latitude, longitude } =
      out;
  } else {
    return next(error(404, "This file type is not supported"));
  }

  // Check directory exists -> if not create it
  if (!fs.existsSync("files/" + datasets_id)) {
    fs.mkdirSync("files/" + datasets_id);
  }

  // Write file
  await writeFileAsync(new_link, output);

  // Define how files are connected
  var parameters_connectid = -9999;
  var connect = "NA";
  if (fileconnect === "time") {
    parameters_connectid = 1;
    var time = variables.find(
      (va) => va.parameters_id === parameters_connectid
    );
    if (time === undefined || time.rAxis.includes("M")) {
      connect = "ind";
    } else {
      connect = "join";
    }
  }
  if (fileconnect === "depth") {
    parameters_connectid = 2;
    var depth = variables.find(
      (va) => va.parameters_id === parameters_connectid
    );
    if (depth.rAxis.includes("M")) {
      connect = "ind";
    } else {
      connect = "join";
    }
  }

  // Update file with information
  await db.query(
    "UPDATE files SET datasets_id = $1, filelink = $2, parameters_connectid = $3, connect = $4, filetype = $5, filelineage = $6, mindatetime = $7, maxdatetime = $8, mindepth = $9, maxdepth = $10, latitude = $11, longitude = $12 WHERE id = $13",
    [
      datasets_id,
      new_link,
      parameters_connectid,
      connect,
      "json",
      inFile_id,
      unix2psqltime(mindatetime),
      unix2psqltime(maxdatetime),
      checkNumeric(mindepth),
      checkNumeric(maxdepth),
      latitude,
      longitude,
      new_id,
    ]
  );
  // Update datasets depth and datetime
  var d_mindatetime = Math.min(
    new Date(dataset.mindatetime).getTime() / 1000,
    mindatetime
  );
  var d_maxdatetime = Math.max(
    new Date(dataset.maxdatetime).getTime() / 1000,
    maxdatetime
  );
  var d_mindepth = Math.min(dataset.mindepth, mindepth);
  var d_maxdepth = Math.max(dataset.maxdepth, maxdepth);
  await db.query(
    "UPDATE datasets SET mindatetime = $1, maxdatetime = $2, mindepth = $3, maxdepth = $4 WHERE id = $5",
    [
      unix2psqltime(d_mindatetime),
      unix2psqltime(d_maxdatetime),
      d_mindepth,
      d_maxdepth,
      datasets_id,
    ]
  );

  res.status(201).send(out);
});

module.exports = router;
