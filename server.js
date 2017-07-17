
const express = require('express');
const bodyParser = require('body-parser');
const pgp = require('pg-promise');
const port = 8000;
const database = require("./database");
const request = require('request-promise');
const FACEBOOK_APP_ID = '156289218248813';
const APP_SECRET = 'c322f877c00b73fc9607399d619952b7';

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


app.get('/servicers/reviewsfor/:id', async function (req, res) {
  const data = await database.getServicerReviewsById(req.params.id);
  res.end(JSON.stringify(data));
})

app.get('/allCategoryTitles', async function(req, res) {
  const data = await database.getAllCategoryTitles();
  res.end(JSON.stringify(data));
})

app.get('/:categoryName/allsubcategories', async function(req, res) {
  const data = await database.getSubcategoriesForCategory(req.params.categoryName);
  res.end(JSON.stringify(data));
})



















app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
