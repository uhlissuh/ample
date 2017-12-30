const apiServer = require('./api-server');
const express = require('express');
const database = require("./src/database");

const port = 8000;

process.on('unhandledRejection', (error) => {
  console.error(error)
})

database.connect("dev");

const app = express();

app.use('/api', apiServer);

app.get('/', (req, res) => {
  res.end(`
    <div>
      Welcome to <b>Ample</b>
    </div>
  `)
})

app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
