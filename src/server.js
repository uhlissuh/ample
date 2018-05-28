const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const database = require("./database");
const apiServer = require('./api-server');
const adminServer = require('./admin-server');
const BusinessSearch = require("./business-search");
const catchErrors = require('./catch-errors');
const pluralize = require('pluralize');
const sslRedirect = require('heroku-ssl-redirect');
const GeoIP = require('geoip-lite');

const CRITERIA_DESCRIPTIONS = {
  fat: 'Body Positivity',
  trans: 'Trans Awareness',
  disabled: 'Accessibility',
  poc: "POC Inclusivity"
};

module.exports =
function (
  cookieSigningSecret,
  facebookClient,
  googleOauthClient,
  googlePlacesClient,
  cache,
  users
) {
  const app = express();
  catchErrors(app);

  app.set('view engine', 'ejs');
  app.set('views', 'src/views');

  app.use(expressLayout);
  app.use('/static', express.static('static'));
  app.use('/api', apiServer);
  app.use('/admin', adminServer(users));
  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json());
  app.use(cookieParser(cookieSigningSecret));

  if (!process.env.STAGING) {
    app.use(sslRedirect(['production'], 301));
  }

  app.get('/', async (req, res) => {
    const isMobile = req.headers.host.startsWith('mobile.');

    const userId = req.signedCookies["userId"];
    let user = null;
    if (userId) {
      user = await database.getUserById(userId);
    }
    const recentReviews = await database.getMostRecentReviews();

    const categories = await database.getAllCategories();

    res.render('index',
      {
        user,
        recentReviews: recentReviews ? recentReviews : null,
        categories,
        isMobile,
        abbreviateAddress
      }
    )
  });

  app.get('/ourvision', async (req, res) => {
    let user = null;
    if (req.signedCookies['userId']) {
      user = await database.getUserById(req.signedCookies['userId']);
    }

    res.render('our_vision', {
      user: user,
    });
  });


  app.get('/feedback', async (req, res) => {
    let user = null;
    if (req.signedCookies['userId']) {
      user = await database.getUserById(req.signedCookies['userId']);
    }

    res.render('feedback', {
      user: user,
    });
  });

  app.get('/followus', async (req, res) => {
    let user = null;
    if (req.signedCookies['userId']) {
      user = await database.getUserById(req.signedCookies['userId']);
    }

    res.render('followus', {
      user: user,
    });
  });


  app.get('/login', (req, res) => {
    res.render('login', {
      facebookAppId: facebookClient.appId,
      googleClientId: googleOauthClient._clientId,
      user: null,
      referer: req.query.referer
    });
  });

  app.post('/login', async (req, res) => {
    const accessToken = req.body['access-token']
    const loginService = req.body['login-service'];

    let userId;
    if (loginService === 'facebook') {
      const response = await facebookClient.getUserInfo(accessToken);
      userId = await database.findOrCreateUser({
        facebookId: response.id,
        email: response.email,
        name: response.name
      });
    } else if (loginService === 'google') {
      const ticket = await googleOauthClient.verifyIdToken({idToken: accessToken});
      const response = ticket.getPayload();
      userId = await database.findOrCreateUser({
        googleId: response.sub,
        email: response.email,
        name: response.name,
      });
    } else {
      throw new Error(`Invalid login service name: ${loginService}`);
    }

    res.cookie('userId', userId, {signed: true, encode: String});
    res.redirect(req.body.referer || '/');
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

    let searchResults
    if (location.toLowerCase() === 'current location') {
      const ip = req.headers['x-forwarded-for'];
      const lookup = GeoIP.lookup(ip);
      let lat, lng
      if (lookup) {
        lat = lookup.ll[0];
        lng = lookup.ll[1];
      } else {

        // Default to portland, for now.
        lat = 45.5442;
        lng = -122.6431;
      }
      searchResults = await businessSearch.findBusinessesForLocation(term, lat, lng);
    } else {
      searchResults = await businessSearch.findBusinesses(term, location);
    }

    res.render('search_results',
      {
        term: term,
        location: location,
        businesses: searchResults,
        user: user,
        categories: await database.getAllCategories()
      }
    );
  });

  app.get('/businesses/:googleId', async function(req, res) {
    const isMobile = req.headers.host.startsWith('mobile.');

    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(req.signedCookies['userId'])
    }
    const googleId = req.params.googleId;
    const reviewedBusiness = await database.getBusinessByGoogleId(googleId);

    let business = await cache.get(googleId);
    if (!business) {
      business = await googlePlacesClient.getBusinessById(googleId);
      await cache.set(googleId, business, 3600);
    }

    let ratingBreakdown = {};
    let reviews = [];
    if (reviewedBusiness) {
      reviews = await database.getBusinessReviewsById(reviewedBusiness.id);
      for (review of reviews) {
        const date = (new Date(review.timestamp)).toDateString();
        review.date = date;
      }

      ratingBreakdown = await database.getBusinessRatingBreakdown(reviewedBusiness.id);

      business.overallRating = reviewedBusiness.overallRating;
      business.reviewCount = reviewedBusiness.reviewCount;

      business.fatAverageRating = reviewedBusiness.fatAverageRating;
      business.fatRatingCount = reviewedBusiness.fatRatingCount;
      business.transAverageRating = reviewedBusiness.transAverageRating;
      business.transRatingCount = reviewedBusiness.transRatingCount;
      business.disabledAverageRating = reviewedBusiness.disabledAverageRating;
      business.disabledRatingCount = reviewedBusiness.disabledRatingCount;
      business.tags = reviewedBusiness.tags;
    }
    const photoReference = business.photos && business.photos[0].photo_reference;

    const reviewUserIds = [];
    let hasReviewedThisBusiness = false;
    for (const review of reviews) {
      reviewUserIds.push(review.user.id)
    }

    if (user && reviewUserIds.includes(user.id)) {
      hasReviewedThisBusiness = true;
    }

    res.render('business',
      {
        googleId,
        photoURL: photoReference && googlePlacesClient.getPhotoURL(photoReference, 900, 900),
        reviews,
        ratingBreakdown,
        user,
        isMobile,
        pluralize,
        CRITERIA_DESCRIPTIONS,
        business,
        hasReviewedThisBusiness
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
        childCategoriesByParentCategory: await database.getChildCategoriesByParentCategory(),
        user: user,
        allTags: await database.getApprovedTags(),
        CRITERIA_DESCRIPTIONS
      })
    }
  });

  app.get('/businesses/:googleId/reviews/:reviewId/edit', async function(req, res) {
    const userId = req.signedCookies['userId'];
    const user = await database.getUserById(userId);
    const review = await database.getReviewById(req.params.reviewId);
    const business = await database.getBusinessByGoogleId(req.params.googleId);

    if (review.user.id === parseInt(userId)) {
      res.render('edit-review', {
        user,
        review,
        business,
        childCategoriesByParentCategory: await database.getChildCategoriesByParentCategory(),
        CRITERIA_DESCRIPTIONS,
        allTags: await database.getApprovedTags()
      });
    } else {
      throw new Error();
    }
  });

  app.post('/businesses/:googleId/reviews/:reviewId', async function(req, res) {
    await database.updateReview(req.params.reviewId, reviewFromRequest(req.body));
    res.redirect(`/businesses/${req.params.googleId}`);
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

    const userId = req.signedCookies['userId'];
    await database.createReview(userId, businessId, reviewFromRequest(req.body));
    res.redirect(`/businesses/${googleId}`)
  });

  function reviewFromRequest(body) {
    const review = {
      content: body.content,
      fatRating: parseInt(body["fat-rating"]),
      transRating: parseInt(body["trans-rating"]),
      disabledRating: parseInt(body["disabled-rating"]),
      pocRating: parseInt(body["poc-rating"]),
      categories: [body['parent-category']],
      tags: body.tags && body.tags.map(tag => tag.trim())
    };

    if (body['child-category']) {
      review.categories.push(body['child-category']);
    }

    return review;
  }

  app.use(async (error, req, res, next) => {
    const userId = req.signedCookies && req.signedCookies.userId;
    const user = userId && await database.getUserById(userId);

    console.error('Caught Error');
    console.error(error.stack);
    res.status(500);
    res.render('error', {user, error});
  });

  return app;
}

function abbreviateAddress(address) {
  address = address.replace(/\s*\d+,\s*USA$/, '');
  return address;
}
