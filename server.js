
const express = require('express');
const pgp = require('pg-promise');
const port = 8000;
const database = require("./database");
const yelp = require("./yelp");
const {YELP_ACCESS_TOKEN} = yelp;
const request = require('request-promise');
const FACEBOOK_APP_ID = '156289218248813';
const APP_SECRET = 'c322f877c00b73fc9607399d619952b7';
const bodyParser = require('body-parser');

database.connect("dev"); 

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


app.get('/allcategorytitles', async function(req, res) {
  const data = await database.getAllCategoryTitles();
  res.end(JSON.stringify(data));
})

app.get('/:categoryName/allsubcategories', async function(req, res) {
  const data = await database.getSubcategoriesForCategory(req.params.categoryName);
  res.end(JSON.stringify(data));
})

app.get('/reviews/:yelpId', async function(req, res) {
  const reviews = await database.getBusinessReviewsByYelpId(req.params.yelpId);
  res.end(JSON.stringify(reviews));
})

app.get('/recentreviews', async function(req, res) {
  let recentReviews = await database.getRecentReviews();
  res.end(JSON.stringify(recentReviews));
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
  let term = req.query.term;
  let latitude= req.query.latitude;
  let longitude = req.query.longitude;
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
  console.log(businessesJSON);
  res.end(JSON.stringify(businessesJSON));
});

app.get('/businesses/searchexisting?', async function(req, res) {
  let category = req.query.category;
  let latitude= req.query.latitude;
  let longitude = req.query.longitude;
  console.log(category, latitude, longitude);
  const existingNearbyBusinesses = await database.getExistingBusinessesByCategoryandLocation(category, latitude, longitude);
  console.log(existingNearbyBusinesses);
  res.end(existingNearbyBusinesses);
});

app.post('/businesses/postreview', async function(req, res) {
  let business = await database.getBusinessByYelpId(req.body.businessYelpId);
  if (!business) {
    const yelpBusiness = await yelp.getBusinessById(req.body.businessYelpId);

    business = {
      yelpId: yelpBusiness.id,
      name: yelpBusiness.name,
      address1: yelpBusiness.location.address1,
      address2: yelpBusiness.location.address2,
      state: yelpBusiness.location.state,
      city: yelpBusiness.location.city,
      phoneNumber: yelpBusiness.phone,
      latitude: yelpBusiness.coordinates.latitude,
      longitude: yelpBusiness.coordinates.longitude,
      categories: yelpBusiness.categories
    };

    console.log("here are all the categories", yelpBusiness.categories);

    business.id = await database.createBusiness(business);
  }

  const reviewId = await database.createReview(business.id, req.body);
  res.end(JSON.stringify({reviewId: reviewId}));
})


















app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
