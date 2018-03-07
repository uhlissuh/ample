const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const database = require("./database");
const apiServer = require('./api-server');
const BusinessSearch = require("./business-search");

module.exports =
function (cookieSigningSecret, facebookClient, googlePlacesClient, cache) {
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
    const recentReviews = await database.getMostRecentReviews();
    console.log(recentReviews);

    res.render('index',
      {
        user: user,
        recentReviews: recentReviews
      }
    )
  });

  app.get('/login', (req, res) => {
    res.render('login', {
      facebookAppId: facebookClient.appId,
      user: null,
      referer: req.query.referer
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
    res.redirect(req.body.referer || '/')
  })

  app.post('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect("/");
  })

  app.get('/profiles/:userId', async function(req, res) {
    if (req.signedCookies["userId"]) {
      const user = await database.getUserById(req.params.userId)
      res.render('profile', {
        user: user
      });
    } else {
      res.redirect('/login');
    }

  })

  app.get('/searchforbusinesses', async function(req, res) {
    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(req.signedCookies['userId'])
    }
    const term = req.query.term;
    const location = req.query.location;
    const businessSearch = new BusinessSearch(googlePlacesClient);
    const searchResults = await businessSearch.findBusinesses(term, location);

    res.render('search_results',
      {
        term: term,
        location: location,
        businesses: searchResults,
        user: user
      }
    );
  });

  app.get('/businesses/:googleId', async function(req, res) {
    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(req.signedCookies['userId'])
    }
    const googleId = req.params.googleId;
    let business = await cache.get(googleId);
    const reviewedBusiness = await database.getBusinessByGoogleId(googleId);
    if (!business) {
      business = await googlePlacesClient.getBusinessById(googleId);
      await cache.set(googleId, business, 3600);
    }
    business.rating = reviewedBusiness ? reviewedBusiness.rating : null;
    business.reviewCount = reviewedBusiness ? reviewedBusiness.reviewCount : null;
    let reviews = [];
    if (reviewedBusiness) {
      reviews = await database.getBusinessReviewsById(reviewedBusiness.id);
      for (review of reviews) {
        review.date = new Date(review.timestamp);
      }
    }
    const photoReference = business.photos && business.photos[0].photo_reference;

    res.render('business',
      {
        name: business.name,
        googleId: googleId,
        formatted_address: business.formatted_address,
        formatted_phone_number: business.formatted_phone_number,
        location: business.geometry.location,
        photoURL: photoReference && googlePlacesClient.getPhotoURL(photoReference, 400, 300),
        rating: business.rating,
        reviewCount: business.reviewCount,
        averageRating: business.totalRating ? business.totalRating / business.reviewCount : null,
        reviews: reviews,
        user: user
      }
    );
  });

  app.get('/businesses/:googleId/reviews/new', async function(req, res) {
    const userId = req.signedCookies['userId'];
    if (!userId) {
      res.redirect('/login?referer=' + req.url);
    } else {
      const user = await database.getUserById(userId);
      const googleId = req.params.googleId;
      let business = await cache.get(req.params.googleId);
      if (!business) {
        business = await googlePlacesClient.getBusinessById(googleId);
        await cache.set(googleId, business, 3600);
      }
      res.render('new_review', {
        name: business.name,
        googleId: googleId,
        formatted_address: business.formatted_address,
        formatted_phone_number: business.formatted_phone_number,
        location: business.geometry.location,
        photos: business.photos,
        rating: business.rating,
        reviewerId: req.signedCookies["userId"],
        user: user
      })
    }
  });

  app.post('/businesses/:googleId/reviews', async function(req, res) {
    const googleId = req.params.googleId;
    let business = await cache.get(googleId);
    if (!business) {
      business = await googlePlacesClient.getBusinessById(googleId);
      await cache.set(googleId, business, 3600);
    }

    const existingBusiness = await database.getBusinessByGoogleId(googleId);
    let businessId;
    if (existingBusiness) {
      businessId = existingBusiness.id;
    } else {
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

    const review = {
      content: req.body.content,
      rating: parseInt(req.body.rating),
      sturdySeating: req.body.sturdySeating === '' ? true : false,
      armlessChairs: req.body.armlessChairs === '' ? true : false,
      wideTableSpacing: req.body.wideTableSpacing === '' ? true : false,
      wideTable: req.body.wideTable === '' ? true : false,
      benchSeating: req.body.benchSeating === '' ? true : false,
      wheelchair: req.body.wheelchair === '' ? true : false,
      dedicatedParking: req.body.dedicatedParking === '' ? true : false,
      handicapParking: req.body.handicapParking === '' ? true : false,
      stairsRequired: req.body.stairsRequired === '' ? true : false,
      weightNeutral: req.body.weightNeutral === '' ? true : false,
      haes: req.body.haes === '' ? true : false,
      fatPositive: req.body.fatPositive === '' ? true : false,
      lgbtq: req.body.lgbtq === '' ? true : false,
      transFriendly: req.body.transFriendly === '' ? true : false,
      pocCentered: req.body.pocCentered === '' ? true : false
    }

    const userId = req.signedCookies['userId'];
    database.createReview(userId, businessId, review)
    res.redirect(`/businesses/${googleId}`)
  });

  return app;
}
