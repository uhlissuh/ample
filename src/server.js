const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const database = require("./database");
const memcached = require("./memcached")
const apiServer = require('./api-server');
const BusinessSearch = require("./business-search");
const GooglePlacesClient = require('./google-places');
const FacebookClient = require('./facebook-client');

const {FACEBOOK_APP_ID, FACEBOOK_APP_SECRET} = process.env;

const facebookClient = new FacebookClient(FACEBOOK_APP_ID, FACEBOOK_APP_SECRET);

process.on('unhandledRejection', (error) => {
  console.error(error)
})

database.connect("dev");

const app = express();

app.set('view engine', 'ejs')
app.set('views', 'src/views')

app.use(expressLayout);
app.use('/static', express.static('static'));
app.use('/api', apiServer);
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.render('index', {currentTime: Date.now()})
});

app.get('/login', (req, res) => {
  res.render('login', {
    facebookAppId: FACEBOOK_APP_ID
  });
});

app.post('/login', async (req, res) => {
  const accessToken = req.body['access-token']
  const response = await facebookClient.getUserInfo(accessToken);

  console.log("RESPONSE", response)
  
  const userId = await database.findOrCreateUser({
    facebookId: response.id,
    email: response.email,
    name: response.name
  })
  res.redirect(`/`)
})

app.get('/searchforbusinesses', async function(req, res) {
  const term = req.query.term;
  const location = req.query.location;
  const googlePlacesClient = new GooglePlacesClient();
  const businessSearch = new BusinessSearch(googlePlacesClient);
  const searchResults = await businessSearch.findBusinesses(term, location);

  res.render('search_results',
    {
      term: term,
      location: location,
      businesses: searchResults
    }
  );

});

app.get('/businesses/:googleId', async function(req, res) {
  const googleId = req.params.googleId;
  let business = await memcached.get(googleId);
  const reviewedBusiness = await database.getBusinessByGoogleId(googleId);
  if (!business) {
    const googlePlacesClient = new GooglePlacesClient();
    business = await googlePlacesClient.getBusinessById(googleId);
    business["totalRating"] = reviewedBusiness ? reviewedBusiness.total_rating : null;
    business["reviewCount"] = reviewedBusiness ? reviewedBusiness.review_count : null;
    await memcached.set(googleId, business, 3600);
  }
  const reviews = await database.getBusinessReviewsById(reviewedBusiness.id)
  res.render('business',
    {
      name: business.name,
      googleId: googleId,
      formatted_address: business.formatted_address,
      formatted_phone_number: business.formatted_phone_number,
      location: business.geometry.location,
      photos: business.photos,
      totalRating: business.totalRating,
      reviewCount: business.reviewCount,
      averageRating: business.totalRating ? business.totalRating / business.reviewCount : null,
      reviews: reviews
    }
  );
})

app.get('/businesses/:googleId/reviews/new', async function(req, res) {
  const googleId = req.params.googleId;
  let business = await memcached.get(req.params.googleId);
  if (!business) {
    const googlePlacesClient = new GooglePlacesClient();
    business = await googlePlacesClient.getBusinessById(googleId);
    await memcached.set(googleId, business, 3600);
  }
  res.render('new_review', {
    name: business.name,
    googleId: googleId,
    formatted_address: business.formatted_address,
    formatted_phone_number: business.formatted_phone_number,
    location: business.geometry.location,
    photos: business.photos,
    rating: business.rating
  })
})

app.post('/businesses/:googleId/reviews', async function(req, res) {
  const googleId = req.params.googleId;
  let business = await memcached.get(googleId);
  if (!business) {
    const googlePlacesClient = new GooglePlacesClient();
    business = await googlePlacesClient.getBusinessById(googleId);
    await memcached.set(googleId, business, 3600);
  }

  const existingBusiness = await database.getBusinessByGoogleId(googleId);
  let businessId = existingBusiness.id;
  if (!existingBusiness) {
    businessId = await database.createBusiness(
    {
      googleId: googleId,
      name: business.name,
      latitude: business.geometry.location.lat,
      longitude: business.geometry.location.lng,
      phone: business.formatted_phone_number,
      address: business.formatted_address
    })
  }
  const review = req.body;
  review.rating = 4.0;
  database.createReview(1, businessId, review)
  res.redirect(`/businesses/${googleId}`)
})

module.exports = app;
