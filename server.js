require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const Guid = require('guid');
const Querystring  = require('querystring');
const RequestPromise  = require('request-promise');

const database = require("./src/database");
const memcached = require("./src/memcached")
const apiServer = require('./api-server');
const BusinessSearch = require("./src/business-search");
const GooglePlacesClient = require('./src/google-places');
const {FACEBOOK_APP_ID, ACCOUNT_KIT_APP_SECRET, CSRF_GUID} = process.env;

const accountKitApiVersion = 'v1.1';
const meEndpointBaseUrl = `https://graph.accountkit.com/${accountKitApiVersion}/me`;
const tokenExchangeBaseUrl = `https://graph.accountkit.com/${accountKitApiVersion}/access_token`;

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

app.get('/login', async function(req, res) {
  res.render('login',
    {
      appId: FACEBOOK_APP_ID,
      csrf: CSRF_GUID,
      version: accountKitApiVersion
    }
  )
});

app.post('/login_success', async function(req, res) {
  // CSRF check
  if (req.body.csrf === CSRF_GUID) {
    const appAccessToken = ['AA', FACEBOOK_APP_ID, ACCOUNT_KIT_APP_SECRET].join('|');
    const params = {
      grant_type: 'authorization_code',
      code: req.body.code,
      access_token: appAccessToken
    };

    // exchange tokens
    const tokenExchangeUrl = tokenExchangeBaseUrl + '?' + Querystring.stringify(params);
    const response = await RequestPromise({uri: tokenExchangeUrl, json: true});
    var view = {
      userAccessToken: response.access_token,
      expiresAt: response.expiresAt,
      userId: response.id,
    };

    // get account details at /me endpoint
    const meEndpointUrl = meEndpointBaseUrl + '?access_token=' + response.access_token;
    const meResponse = await RequestPromise({uri: meEndpointUrl, json: true})
    if (meResponse.phone) {
      view.phoneNum = meResponse.phone.number;
      view.emailAddress = null;
    } else if (meResponse.email) {
      view.emailAddress = meResponse.email.address;
      view.phoneNum = null;
    }
    res.render('login_success', view);
  } else {
    // login failed
   res.writeHead(200, {'Content-Type': 'text/html'});
   res.end("Something went wrong. :( ");
  }

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


app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
