const Router = require("express-promise-router");
const router = new Router();
const fs = require("fs");
const netcdf4 = require("netcdf4");
const multer = require("multer");

verifyIncomingData = (data) => {
  return true;
};

possibleTypes = [
  "byte",
  "char",
  "short",
  "int",
  "ubyte",
  "ushort",
  "uint",
  "float",
  "double",
];

router.post("/", async (req, res, next) => {
  var dataset = req.body;
  if (typeof dataset !== "object" || dataset === null) {
    return next(error(400, "Request body not an object"));
  } else if (!verifyIncomingData(dataset)) {
    return next(error(400, "Request object does not agree with data type"));
  }

  var tempID = Math.round(Math.random() * 1000000);
  var tempPath = `./data/tmp/${tempID}.nc`;
  var ncfile = new netcdf4.File(tempPath, "c");

  if ("attributes" in dataset) {
    for (let i = 0; i < dataset.attributes.length; i++) {
      let type = "char";
      if (
        "type" in dataset.attributes[i] &&
        possibleTypes.includes(dataset.attributes[i].type)
      ) {
        type = dataset.attributes[i].type;
      }
      let name = dataset.attributes[i].name;
      let value = dataset.attributes[i].value;
      ncfile.root.addAttribute(name, type, value);
    }
  }
  var dimdict = {};
  if ("dimensions" in dataset) {
    for (let i = 0; i < dataset.dimensions.length; i++) {
      let name = dataset.dimensions[i].name;
      let len = "unlimited";
      if (
        "len" in dataset.dimensions[i] &&
        (dataset.dimensions[i].len === "unlimited" ||
          Number.isInteger(dataset.dimensions[i].len))
      ) {
        len = dataset.dimensions[i].len;
      } else {
        try {
          len = dataset.data[name].length;
        } catch (e) {}
      }
      let newdim = ncfile.root.addDimension(name, len);
      dataset.dimensions[i]["id"] = newdim.id;
      dimdict[name] = newdim.id;
    }
  }

  if ("variables" in dataset) {
    for (let i = 0; i < dataset.variables.length; i++) {
      let type = "float";
      if (
        "type" in dataset.variables[i] &&
        possibleTypes.includes(dataset.variables[i].type)
      ) {
        type = dataset.variables[i].type;
      }
      let name = dataset.variables[i].name;
      let textdimensions = dataset.variables[i].dimensions;
      let dimensions = textdimensions.map((td) => dimdict[td]);
      let newvar = ncfile.root.addVariable(name, type, dimensions);

      // Add Attributes
      if ("attributes" in dataset.variables[i]) {
        for (let j = 0; j < dataset.variables[i].attributes.length; j++) {
          let atttype = "char";
          if (
            "type" in dataset.variables[i].attributes[j] &&
            possibleTypes.includes(dataset.variables[i].attributes[j].type)
          ) {
            atttype = dataset.variables[i].attributes[j].type;
          }
          let attname = dataset.variables[i].attributes[j].name;
          let attvalue = dataset.variables[i].attributes[j].value;

          newvar.addAttribute(attname, atttype, attvalue);
        }
      }

      // Add data to variable
      function variableLoop(newvar, data, arr, depth) {
        for (let i = 0; i < data.length; i++) {
          let arr_inner = [...arr];
          arr_inner.push(i);
          if (depth === 1) {
            newvar.write(...arr_inner, data[i]);
          } else {
            variableLoop(newvar, data[i], arr_inner, depth - 1);
          }
        }
      }

      variableLoop(newvar, dataset.data[name], [], dimensions.length);
    }
  }

  ncfile.close();

  // Pipe Completed NetCDF file
  var filename = "ConvertedToNetCDF";
  if ("filename" in dataset) filename = dataset.filename;
  res.setHeader(
    "Content-disposition",
    "attachment; filename=" + filename + ".nc"
  );
  res.setHeader("Content-type", ".nc");
  var filestream = fs.createReadStream(tempPath);
  var stream = filestream.pipe(res);
  stream.on("finish", function () {
    fs.unlinkSync(tempPath);
  });
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./data/tmp");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

var upload = multer({ storage: storage }).single("file");

router.post("/readfile/", async (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err);
    } else if (err) {
      return res.status(500).json(err);
    }
    if ("file" in req) {
      var filestream = fs.createReadStream(req.file.path);
      var stream = filestream.pipe(res);
      stream.on("finish", function () {
        fs.unlinkSync(req.file.path);
      });
    } else {
      return res.status(400).json("No file selected");
    }
  });
});

module.exports = router;
