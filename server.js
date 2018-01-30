require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');

const database = require("./src/database");
const memcached = require("./src/memcached")
const apiServer = require('./api-server');
const BusinessSearch = require("./src/business-search");
const GooglePlacesClient = require('./src/google-places');

const port = 8000;

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
  if (!business) {
    const googlePlacesClient = new GooglePlacesClient();
    business = await googlePlacesClient.getBusinessById(googleId);
    const reviewedBusiness = await database.getBusinessByGoogleId(googleId);
    business["totalRating"] = reviewedBusiness ? reviewedBusiness.total_rating : null;
    business["reviewCount"] = reviewedBusiness ? reviewedBusiness.review_count : null;
    await memcached.set(googleId, business, 3600);
  }

  console.log(business.rating);

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
      averageRating: business.totalRating ? business.totalRating / business.reviewCount : null
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
  console.log(business);
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


app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
