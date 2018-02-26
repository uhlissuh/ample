require('dotenv').config();
const app = require('./server');
const {PORT} = process.env;

app.listen(PORT, err => {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', PORT);
});
