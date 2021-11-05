const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const creds = require("../config");
const { error } = require("../functions");

router.post("/", async (req, res, next) => {
  try {
    await axios.post("https://api.sendgrid.com/v3/mail/send", req.body, {
      headers: { Authorization: `Bearer ${creds.sendgrid_token}` },
    });
    res.status(201).send();
  } catch (e) {
    return next(error(500, "Failed to send mail.", e.message));
  }
});

module.exports = router;
