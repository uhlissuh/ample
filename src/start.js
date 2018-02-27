require('dotenv').config();
const FacebookClient = require('./facebook-client');
const database = require('./database');
const server = require('./server');

const {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  PORT,
  COOKIE_SIGNING_SECRET
} = process.env;

process.on('unhandledRejection', console.error);

database.connect("dev");

const app = server(
  COOKIE_SIGNING_SECRET,
  new FacebookClient(FACEBOOK_APP_ID, FACEBOOK_APP_SECRET)
);

app.listen(PORT, err => {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', PORT);
});
