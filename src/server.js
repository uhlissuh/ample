const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const database = require("./database");
const memcached = require("./memcached")
const apiServer = require('./api-server');
const BusinessSearch = require("./business-search");
const GooglePlacesClient = require('./google-places');

module.exports =
function (cookieSigningSecret, facebookClient) {
  const app = express();

  app.set('view engine', 'ejs')
  app.set('views', 'src/views')

  app.use(expressLayout);
  app.use('/static', express.static('static'));
  app.use('/api', apiServer);
  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json());
  app.use(cookieParser(cookieSigningSecret));

  app.get('/', async (req, res) => {
    const userId = req.signedCookies["userId"];
    let user = null;
    if (userId) {
      user = await database.getUserById(userId);
    }

    res.render('index',
      {
        user: user
      }
    )
  });

  app.get('/login', (req, res) => {
    res.render('login', {
      facebookAppId: facebookClient.appId
    });
  });

  app.post('/login', async (req, res) => {
    const accessToken = req.body['access-token']
    const response = await facebookClient.getUserInfo(accessToken);
    const userId = await database.findOrCreateUser({
      facebookId: response.id,
      email: response.email,
      name: response.name
    })
    res.cookie('userId', userId, {signed: true, encode: String})
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
    const reviews = [];
    if (reviewedBusiness) {
      reviews = await database.getBusinessReviewsById(reviewedBusiness.id);
    }
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
    if (!req.signedCookies["userId"]) {
      console.log("not logged in");
      res.redirect('/login');
    } else {
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
        rating: business.rating,
        reviewerId: req.signedCookies["userId"]
      })
    }

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

  return app;
}
