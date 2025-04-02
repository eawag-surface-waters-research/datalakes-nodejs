// Change name to config.js
module.exports = {
  db_user: "", // Database username (production db)
  db_host: "", // Database host address (production db)
  db_database: "", // Database name (production db)
  db_password: "", // Database password (production db)
  db_port: 5432, // Database port (production db)
  apiUrl: "https://localhost:4000", // URL of this Nodejs app 
  API_KEY: "", // Set API access key for automated access to protected datasets
  sendgrid_token: "", // Sendgrid token for sending automated emails
  default_port: 4000 // Default port
};