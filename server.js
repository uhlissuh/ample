
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const pgp = require('pg-promise');
const port = 8000;
const database = require("./database");

process.on('unhandledRejection', (error) => {
  console.error(error)
})

const app = express();

app.get('/', function(req, res) {
  res.send("HIII");
  res.end();
});

app.get('/categories/:categoryId', async function(req, res) {
  const data = await database.getServicersByCategory(req.params.categoryId);
  res.end(JSON.stringify(data));
})
























app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
