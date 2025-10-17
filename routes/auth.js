const Router = require("express-promise-router");
const router = new Router();
const axios = require("axios");
const querystring = require("querystring");

// Step 2: GitHub redirects back here with a code
router.post("/github/token", async (req, res) => {
  const { code } = req.body;

  try {
    // Step 3: Exchange code for access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      querystring.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 4: Get user data
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });

    const payload = {
      token: accessToken,
      user: userRes.data,
    };

    // Redirect back to frontend with user data
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router;