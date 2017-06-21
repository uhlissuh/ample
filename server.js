
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const port = 8000;


const app = express();

app.get('/', function(req, res) {
  res.send("HIII");
  res.end();
});

























app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
});
