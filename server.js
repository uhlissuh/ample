
const express = require('express');
const bodyParser = require('body-parser');
const pgp = require('pg-promise');
const port = 8000;
const database = require("./database");
const request = require('request-promise');
const FACEBOOK_APP_ID = '156289218248813';
const APP_SECRET = 'c322f877c00b73fc9607399d619952b7';
const YELP_ACCESS_TOKEN = "ZUJ4B1pZo7rpbp0R5ZYbHR6MJ5oca-rZRtjX6RzQVMeiOo3gt3hYh4ZHWPR019D5tOX2sqmNwKM1FnbdI77lVS_fIY871Jcpi-Xj3nC57peQVamHmFch7gtXk_ZvWXYx";

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

app.get('/allcategorytitles', async function(req, res) {
  const data = await database.getAllCategoryTitles();
  res.end(JSON.stringify(data));
})

app.get('/:categoryName/allsubcategories', async function(req, res) {
  const data = await database.getSubcategoriesForCategory(req.params.categoryName);
  res.end(JSON.stringify(data));
})

app.get('/getyelptoken', async function(req, res) {
  var options = {
    method: 'POST',
    uri: 'https://api.yelp.com/oauth2/token',
    form: {
    "grant_type": "client_credentials",
    "client_id": "xg9ywx63H-Aadm7XULtnCA",
    "client_secret": "RmZF07zH90vQTGumefuYgAPleYKKio3us7CjuuGXICXBltSq9XpJHmEuRbFpVFXU"
    },
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  };

  request(options)
    .then(function(body) {
      console.log(body);
    })
    .catch( function (error) {
      console.log(error);
    })

  res.end();
})

app.get('/businesses/search?', async function(req, res) {
  let term = req.query.term
  let latitude= req.query.latitude
  let longitude = req.query.longitude
  console.log(term, latitude, longitude);
  addOnUrl ="term=" + term + "&latitude=" + latitude + "&longitude=" + longitude + "&radius=4000"
  let options = {
    uri: 'https://api.yelp.com/v3/businesses/search?' + addOnUrl,
    headers: {
      'Authorization': 'Bearer ' + YELP_ACCESS_TOKEN
    },
    json: true
  };
  console.log(options.uri);
  try {
    var businessesJSON = await request(options);
  } catch(error) {
    console.log(error);
  }
  res.end(JSON.stringify(businessesJSON));
})


















app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
