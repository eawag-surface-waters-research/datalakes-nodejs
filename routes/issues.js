const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const https = require("https");
const creds = require("../config");
const db = require("../db");
const { error, parseSSH } = require("../functions");

const agent = new https.Agent({
  rejectUnauthorized: false,
});

router.post("/", async (req, res, next) => {
  var { title, description, repo_id } = req.body;

  if (!isInt(repo_id)) {
    return next(error(400, "ID must be an integer"));
  }

  var { rows } = await db.query("SELECT * FROM repositories WHERE id = $1", [
    repo_id,
  ]);

  if (rows.length < 1) {
    return next(error(404, "Repository not found in database"));
  }

  var { folder } = parseSSH(rows[0].ssh);
  folder = encodeURIComponent(folder);

  if (rows[0].ssh.includes("git@renkulab.io")) {
    try {
      var { data } = await axios.get(
        "https://renkulab.io/gitlab/api/v4/projects/" + folder,
        {
          httpsAgent: agent,
          headers: { Authorization: `Bearer ${creds.RENKU_LAB_API_KEY}` },
        }
      );
      await axios.post(
        "https://renkulab.io/gitlab/api/v4/projects/" + data.id + "/issues",
        { title, description, assignee_id: 358 },
        {
          httpsAgent: agent,
          headers: { Authorization: `Bearer ${creds.RENKU_LAB_API_KEY}` },
        }
      );
      res.status(201).send();
    } catch (e) {
      return next(error(500, "Failed to report issue.", e.message));
    }
  } else {
    return next(error(404, "Unable to add issues to non-renku repositories"));
  }
});

module.exports = router;
