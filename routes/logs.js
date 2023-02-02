const Router = require("express-promise-router");
const router = new Router();
const { error, isInt } = require("../functions");
const { exec } = require("child_process");

router.get("/:rows", async (req, res, next) => {
  var rows = req.params.rows;
  if (!isInt(rows)) {
    return next(error(400, "Rows must be an integer"));
  }
  try {
    exec(
      `tail -n ${rows} ~/.pm2/logs/datalakes-out.log`,
      (error, stdout, stderr) => {
        res.set({"Content-Disposition":"attachment; filename=\"log.txt\""});
        res.status(200).send(stdout);
      }
    );
  } catch (e) {
    return next(error(500, "Failed to access logs"));
  }
});

module.exports = router;
