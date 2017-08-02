
const express = require('express');
const pgp = require('pg-promise');
const port = 8000;
const database = require("./database");
const request = require('request-promise');
const FACEBOOK_APP_ID = '156289218248813';
const APP_SECRET = 'c322f877c00b73fc9607399d619952b7';
const YELP_ACCESS_TOKEN = "ZUJ4B1pZo7rpbp0R5ZYbHR6MJ5oca-rZRtjX6RzQVMeiOo3gt3hYh4ZHWPR019D5tOX2sqmNwKM1FnbdI77lVS_fIY871Jcpi-Xj3nC57peQVamHmFch7gtXk_ZvWXYx";
const bodyParser = require('body-parser');

process.on('unhandledRejection', (error) => {
  console.error(error)
})

const app = express();
// app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

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
  addOnUrl ="term=" + term + "&latitude=" + latitude + "&longitude=" + longitude + "&radius=4000"
  let options = {
    uri: 'https://api.yelp.com/v3/businesses/search?' + addOnUrl,
    headers: {
      'Authorization': 'Bearer ' + YELP_ACCESS_TOKEN
    },
    json: true
  };
  try {
    var businessesJSON = await request(options);
  } catch(error) {
    console.log(error);
  }
  res.end(JSON.stringify(businessesJSON));
})

app.post('/businesses/postreview', async function(req, res) {
  let businessReviewed = {
    "businessName": req.body.businessName,
    "businessAddress": req.body.businessAddress,
    "businessAddress2": req.body.businessAddress2,
    "businessCity": req.body.businessCity,
    "businessState": req.body.businessState,
    "latitude": req.body.latitude,
    "longitude": req.body.longitude,
    "fatFriendlyRating" : req.body.fatFriendlyRating,
    "skillRating": req.body.skillRating,
    "skillRating" : req.body.skillRating,
    "reviewContent" : req.body.reviewContent,
    "accountKitId": req.body.accountKitId,
    "accountEmail": req.body.accountEmail ,
    "accountPhone": req.body.accounNumber,
    "reviewTimestamp": req.body.reviewTimestamp
  }

  let statusReturn = {
    "success": false,
  }

  const existingBusiness = await database.getBusinessbyName(businessReviewed.businessName)
  console.log(existingBusiness.length);
  if (existingBusiness.length == 0) {
    const createdBusinessId = await database.createBusiness(businessReviewed)
    const reviewId = await database.insertReview(businessReviewed, createdBusinessId)
    statusReturn.success = true
    statusReturn["reviewId"] = reviewId
  } else {
    const reviewId = await database.insertReview(businessReviewed, existingBusiness[0].id)
    statusReturn.success = true
    statusReturn["reviewId"] = reviewId
  }

  console.log(statusReturn);

  res.end(JSON.stringify(statusReturn))
})

















app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
