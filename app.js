const express = require("express");
const swaggerJsDoc = require("swagger-jsdoc");

module.exports = () => {
  const app = express();
  // Just a basic route
  app.use(express.json());
  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-Requested-With,content-type,api_key"
    );
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
  });

  // Add Routes
  const mountRoutes = require("./routes");
  mountRoutes(app);

  // Add Documentation
  const swaggerOptions = {
    swaggerDefinition: {
      info: {
        version: "1.0.0",
        title: "Datalakes API",
        description: "Datalakes API Information",
        contact: {
          name: "James Runnalls",
        },
      },
      securityDefinitions: {
        APIKeyHeader: {
          type: "apiKey",
          in: "header",
          name: "api_key",
        },
      },
      tags: [
        {
          name: "Datasets",
          description: "Access to metadata for all the datasets in Datalakes",
        },
        {
          name: "Files",
          description: "Access to files metadata for given dataset",
        },
        {
          name: "Download",
          description: "Download files from Datalakes",
        },
        {
          name: "Dataset Parameters",
          description: "Access to metadata on the parameters for each dataset",
        },
        {
          name: "Selection Tables",
          description: "Access all the Datalakes look up tables",
        },
      ],
      security: [{ APIKeyHeader: [] }],
    },
    apis: ["routes/*.js"],
  };
  var swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.get("/docs", function (req, res) {
    res.send(swaggerDocs);
  });

  // Error Handling
  app.use(function (err, req, res, next) {
    if (!err.statusCode) err.statusCode = 500;
    if (!err.description) err.description = "";
    console.log(err)
    res.status(err.statusCode).send({
      code: err.statusCode,
      message: err.message,
      details: err.description,
    });
  });

  // Load Server
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Listening on port ${port}...'`));
};
