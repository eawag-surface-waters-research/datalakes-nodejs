const Router = require("express-promise-router");
const router = new Router();
const fs = require("fs");
const archiver = require("archiver");
const stream = require("stream");
const creds = require("../config");

// S3 Connections
var AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: creds.AWS_accessKeyId,
  secretAccessKey: creds.AWS_secretAccessKey,
  region: creds.AWS_region,
});
AWS.config.setPromisesDependency();
const s3 = new AWS.S3();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

const streamTo = (bucket, key, resolve) => {
    var passthrough = new stream.PassThrough();
    s3.upload(
      {
        Bucket: bucket,
        Key: key,
        Body: passthrough,
        ContentType: "application/zip",
        ServerSideEncryption: "AES256",
      },
      (err, data) => {
        if (err) throw err;
        console.log("Zip uploaded");
        resolve();
      }
    ).on("httpUploadProgress", (progress) => {
      console.log(progress);
    });
    return passthrough;
  };
  
  const getStream = (bucket, key) => {
    let streamCreated = false;
    const passThroughStream = new stream.PassThrough();
  
    passThroughStream.on("newListener", (event) => {
      if (!streamCreated && event == "data") {
        const s3Stream = s3
          .getObject({ Bucket: bucket, Key: key })
          .createReadStream();
        s3Stream
          .on("error", (err) => passThroughStream.emit("error", err))
          .pipe(passThroughStream);
  
        streamCreated = true;
      }
    });
  
    return passThroughStream;
  };

const sendStatus = async (bucket, id, message) => {
  fs.writeFileSync("/tmp/status.txt", message);
  const fileStream = fs.createReadStream("/tmp/status.txt");
  const uploadParams = {
    Bucket: bucket,
    Body: fileStream,
    Key: `${id}/status.txt`,
  };
  return s3.upload(uploadParams).promise();
};

router.post("/", async (req, res, next) => {
  const requestBody = req.body;
  const id = Math.floor(Math.random() * 10000000000);
  const bucket = requestBody["bucket"];
  const keys = requestBody["keys"];
  const zip = requestBody["zip"].replace(".zip", "");
  const upload_bucket = "eawag-zipped";
  const destinationKey = `${id}/${zip}.zip`;
  const download_link = `https://${upload_bucket}.s3.eu-central-1.amazonaws.com/${destinationKey}`;
  const status_link = `https://${upload_bucket}.s3.eu-central-1.amazonaws.com/${id}/status.txt`;

  res.status(202).send(JSON.stringify({ status_link, download_link }));

  await sendStatus(upload_bucket, id, "Running");

  new Promise(async (resolve, reject) => {
    var zipStream = streamTo(upload_bucket, destinationKey, resolve);
    zipStream.on("error", reject);

    var archive = archiver("zip");
    archive.on("error", (err) => {
      sendStatus(upload_bucket, id, "Failed");
    });
    archive.on("finish", () => {
      sendStatus(upload_bucket, id, "Complete");
    });
    archive.pipe(zipStream);

    for (const key of keys) {
      archive.append(getStream(bucket, key), { name: key });
    }
    archive.finalize();
  }).catch((err) => {
    sendStatus(upload_bucket, id, "Failed");
    throw new Error(err);
  });
});

module.exports = router;
