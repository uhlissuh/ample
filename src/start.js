const FacebookClient = require('./facebook-client');
const GooglePlacesClient = require('./google-places');
const database = require('./database');
const server = require('./server');
const Memcached = require("./memcached")

if (process.env.NODE_ENV === 'production') {
  database.connect(process.env.DATABASE_URL);
} else {
  require('dotenv').config();
  const databaseConfig = require("../database.json");
  database.connect(databaseConfig.dev);
}

const {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  GOOGLE_API_KEY,
  PORT,
  COOKIE_SIGNING_SECRET,
  MEMCACHEDCLOUD_SERVERS,
  MEMCACHEDCLOUD_USERNAME,
  MEMCACHEDCLOUD_PASSWORD,
} = process.env;

process.on('unhandledRejection', console.error);

const app = server(
  COOKIE_SIGNING_SECRET,
  new FacebookClient(
    FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET
  ),
  new GooglePlacesClient(
    GOOGLE_API_KEY
  ),
  new Memcached(
    MEMCACHEDCLOUD_SERVERS,
    MEMCACHEDCLOUD_USERNAME,
    MEMCACHEDCLOUD_PASSWORD
  )
);

app.listen(PORT, err => {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', PORT);
});
