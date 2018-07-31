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
const probeImage = require('probe-image-size');
const countriesStates = require('./countries-states.json');

const CRITERIA_DESCRIPTIONS = {
  fat: 'Size Inclusivity',
  trans: 'Trans Inclusivity',
  disabled: 'Disability Inclusivity',
  poc: "BIPOC Inclusivity"
};

module.exports =
function (
  cookieSigningSecret,
  facebookClient,
  googleOauthClient,
  googlePlacesClient,
  cache,
  s3Client,
  users,
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

    const categories = await database.getAllCategories();

    let allReviews = await cache.get("reviews");
    if (!allReviews) {
      allReviews = await database.getAllReviewsForMap();
      await cache.set("reviews", allReviews, 900);
    }

    let recentReviews = [];

    for (let review of allReviews) {
      if (review.businessGoogleId) {
        let googleBusiness = await cache.get(review.businessGoogleId);
        if (!googleBusiness) {
          googleBusiness = await googlePlacesClient.getBusinessById(review.businessGoogleId);
        }
        if (googleBusiness.photos) {
          review["photoURL"] = googlePlacesClient.getPhotoURL(googleBusiness.photos[0].photo_reference, 500, 500);
          recentReviews.push(review);
          if (recentReviews.length == 3) {
            break;
          }
        }
      }
    }

    res.render('index',
      {
        user,
        recentReviews: recentReviews ? recentReviews : null,
        categories,
        isMobile,
        abbreviateAddress,
        allReviews
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

  app.get('/team', async (req, res) => {
    let user = null;
    if (req.signedCookies['userId']) {
      user = await database.getUserById(req.signedCookies['userId']);
    }

    res.render('team', {
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

      const ownedBusinesses = await database.findOwnedBusinesses(req.params.userId);

      res.render('profile', {
        user,
        ownedBusinesses
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

  app.get('/businesses/new', async function(req, res) {
    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(req.signedCookies['userId']);
      res.render('add-business',
        {
          user,
          countries: JSON.stringify(countriesStates),
          childCategoriesByParentCategory: await database.getChildCategoriesByParentCategory(),
        }
      );
    } else {
      res.redirect('/login?referer=' + req.url);
    }

  });

  app.get('/businesses/:id', async function(req, res) {
    const isMobile = req.headers.host.startsWith('mobile.');

    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(req.signedCookies['userId'])
    }

    let googleId, existingBusiness;
    if (isGoogleId(req.params.id)) {
      googleId = req.params.id;
      existingBusiness = await database.getBusinessByGoogleId(googleId);
    } else {
      existingBusiness = await database.getBusinessById(req.params.id);
      googleId = existingBusiness.googleId;
    }

    let googleBusiness;
    if (googleId) {
      googleBusiness = await cache.get(googleId);
      if (!googleBusiness) {
        googleBusiness = await googlePlacesClient.getBusinessById(googleId);
        await cache.set(googleId, googleBusiness, 3600);
      }
    }

    let ratingBreakdown = null;
    let reviews = [];
    if (existingBusiness) {
      reviews = await database.getBusinessReviewsById(existingBusiness.id);
      for (review of reviews) {
        const date = (new Date(review.timestamp)).toDateString();
        review.date = date;
      }

      ratingBreakdown = await database.getBusinessRatingBreakdown(existingBusiness.id);
    }

    const reviewUserIds = [];
    let hasReviewedThisBusiness = false;
    for (const review of reviews) {
      reviewUserIds.push(review.user.id)
    }

    if (user && reviewUserIds.includes(user.id)) {
      hasReviewedThisBusiness = true;
    }

    let business;
    if (existingBusiness) {
      business = {
        id: existingBusiness.id,
        name: existingBusiness.name,
        address: existingBusiness.address,
        phone: existingBusiness.phone,
        overallRating : existingBusiness.overallRating,
        reviewCount : existingBusiness.reviewCount,
        fatAverageRating : existingBusiness.fatAverageRating,
        fatRatingCount : existingBusiness.fatRatingCount,
        transAverageRating : existingBusiness.transAverageRating,
        transRatingCount : existingBusiness.transRatingCount,
        disabledAverageRating : existingBusiness.disabledAverageRating,
        disabledRatingCount : existingBusiness.disabledRatingCount,
        tags : existingBusiness.tags,
        ownerId: existingBusiness.ownerId,
        takenPledge: existingBusiness.takenPledge,
        ownershipConfirmed: existingBusiness.ownershipConfirmed,
        ownerStatement: existingBusiness.ownerStatement
      };
    } else {
      business = {
        id: googleBusiness.place_id,
        name: googleBusiness.name,
        address: googleBusiness.formatted_address,
        phone: googleBusiness.formatted_phone_number
      }
    }

    const photos = await database.getBusinessPhotosById(business.id);

    if (googleBusiness && googleBusiness.photos) {
      const googlePhoto = googleBusiness.photos[0].photo_reference;
      photos.unshift({
        userId: null,
        width: 900,
        height: 900,
        url: googlePlacesClient.getPhotoURL(googlePhoto, 900, 900)
      })
    }

    res.render('business', {
      googleId,
      photos,
      reviews,
      ratingBreakdown,
      user,
      isMobile,
      pluralize,
      CRITERIA_DESCRIPTIONS,
      business,
      hasReviewedThisBusiness
    });
  });

  app.get('/businesses/:id/claim', async function(req, res) {
    const userId = req.signedCookies['userId'];

    if (!userId) {
      res.redirect('/login?referer=' + req.url);
      return;
    }

    const user = await database.getUserById(userId);

    const businessId = req.params.id;

    res.render('claim-business',
      {
        user,
        businessId
      }
    );
  });

  app.get('/businesses/:id/claim/edit', async function(req, res) {
    const userId = req.signedCookies['userId'];

    if (!userId) {
      res.redirect('/login?referer=' + req.url);
      return;
    }

    const user = await database.getUserById(userId);

    const businessId = req.params.id;

    const business = await database.getBusinessById(businessId);

    if (business.ownerId === parseInt(userId)) {
      res.render('edit-claim-business',
        {
          user,
          business
        }
      );
    } else {
      res.render('404-error', {user})
    }
  });

  app.post('/businesses/:id/claim', async function(req, res) {
    const userId = req.signedCookies['userId'];
    const user = await database.getUserById(userId);

    if (!userId) {
      res.redirect('/login?referer=' + req.url);
      return;
    }

    let businessId;
    if (isGoogleId(req.params.id)) {
      const googleBusiness = await googlePlacesClient.getBusinessById(req.params.id)
      businessId = await database.createBusiness({
        googleId: req.params.id,
        name: googleBusiness.name,
        latitude: googleBusiness.geometry.location.lat,
        longitude: googleBusiness.geometry.location.lng,
        phone: googleBusiness.formatted_phone_number,
        address: googleBusiness.formatted_address
      })
    } else {
      businessId = req.params.id;
    }

    let takenPledge
    if (req.body.ownsBusiness.length >= 0) {
      if (req.body.takenPledge.length >= 0) {
        takenPledge = true;
      } else {
        takenPledge = false;
      }
      await database.claimBusiness(userId, businessId, takenPledge, req.body.ownerStatement);
      res.redirect(`/businesses/${businessId}`);
    } else {
      res.render('error', {user});
    }
  });

  app.get('/businesses/:id/reviews/new', async function(req, res) {
    const userId = req.signedCookies['userId'];

    const name = req.query.name;
    const address = req.query.address;

    if (!userId) {
      res.redirect('/login?referer=' + req.url);
      return;
    }

    const user = await database.getUserById(userId);

    res.render('new_review', {
      id: req.params.id,
      name: name,
      address: address,
      reviewerId: userId,
      childCategoriesByParentCategory: await database.getChildCategoriesByParentCategory(),
      user: user,
      allTags: await database.getApprovedTags(),
      CRITERIA_DESCRIPTIONS
    })
  });

  app.get('/businesses/:id/reviews/:reviewId/edit', async function(req, res) {
    const userId = req.signedCookies['userId'];
    const user = await database.getUserById(userId);
    const review = await database.getReviewById(req.params.reviewId);
    const business = await database.getBusinessById(req.params.id);

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

  app.post('/businesses/:id/reviews/:reviewId', async function(req, res) {
    await database.updateReview(req.params.reviewId, reviewFromRequest(req.body));
    res.redirect(`/businesses/${req.params.id}`);
  });

  app.post('/businesses/:id/reviews', async function(req, res) {

    let googleBusiness, existingBusiness, businessId;

    if (isGoogleId(req.params.id)) {
      googleId = req.params.id;
      googleBusiness = await cache.get(googleId);
      if (!googleBusiness) {
        googleBusiness = await googlePlacesClient.getBusinessById(googleId);
        await cache.set(googleId, googleBusiness, 3600);
      }
    } else {
      existingBusiness = await database.getBusinessById(req.params.id);
    }

    if (existingBusiness) {
      businessId = existingBusiness.id;
    } else {
      businessId = await database.createBusiness(
      {
        googleId: googleId,
        name: googleBusiness.name,
        latitude: googleBusiness.geometry.location.lat,
        longitude: googleBusiness.geometry.location.lng,
        phone: googleBusiness.formatted_phone_number,
        address: googleBusiness.formatted_address
      })
    }

    const userId = req.signedCookies['userId'];
    await database.createReview(userId, businessId, reviewFromRequest(req.body));
    res.redirect(`/businesses/${businessId}`)
  });

  app.get('/businesses/:id/photos', async function(req, res) {
    let user = null;
    const userId = req.signedCookies['userId'];
    if (userId) {
      user = await database.getUserById(userId)
    }

    let business;
    if (isGoogleId(req.params.id)) {
      business = await database.getBusinessByGoogleId(req.params.id);
    } else {
      business = await database.getBusinessById(req.params.id);
    }

    const photos = await database.getBusinessPhotosById(business.id);

    res.render('business-photos', {
      business,
      photos,
      user
    });
  });

  app.post('/businesses/:id/photos', async function(req, res) {
    const userId = req.signedCookies['userId'];
    if (!userId) {
      return res.redirect(`/login?referer=/businesses/${req.params.id}`);
    }

    let businessId
    if (isGoogleId(req.params.id)) {
      const googleId = req.params.id;
      let googleBusiness = await cache.get(googleId);
      if (!googleBusiness) {
        googleBusiness = await googlePlacesClient.getBusinessById(googleId);
        await cache.set(googleId, googleBusiness, 3600);
      }
      businessId = await database.createBusiness({
        googleId: googleId,
        name: googleBusiness.name,
        latitude: googleBusiness.geometry.location.lat,
        longitude: googleBusiness.geometry.location.lng,
        phone: googleBusiness.formatted_phone_number,
        address: googleBusiness.formatted_address
      })
    } else {
      businessId = req.params.id
    }

    const photoURL = req.body['photo-url']

    let photoInfo
    try {
      photoInfo = await probeImage(photoURL)
    } catch (_) {}

    if (!photoInfo || !['png', 'jpg'].includes(photoInfo.type)) {
      res.status(422);
      res.end('Business photos need to be JPEG or PNG files');
      return;
    }

    await database.addBusinessPhoto(businessId, userId, {
      url: photoURL,
      width: photoInfo.width,
      height: photoInfo.height
    })
    res.redirect(`/businesses/${businessId}`);
  });

  app.post('/businesses', async function(req, res) {
    const userId = req.signedCookies['userId'];
    const user = await database.getUserById(userId);
    if (user) {
      var city = req.body.city;
      const re = /(\b[a-z](?!\s))/g;

      city = city.replace(re, function(x){return x.toUpperCase();});

      const formattedAddress = req.body.address + ", " +
         city +  ", "  + req.body.state +  ", " + req.body.country;

      const geometry = await googlePlacesClient.getCoordinatesForLocationName(formattedAddress);
      console.log(geometry);

      let business = {
        name: req.body.name,
        latitude: geometry.lat,
        longitude: geometry.lng,
        phone: req.body.phone,
        address: formattedAddress,
        userId,
        categories: [req.body['parent-category']]
      }

      if (req.body['child-category']) {
        business.categories.push(req.body['child-category']);
      }

      businessId = await database.createBusiness(business);

      res.redirect(`/businesses/${businessId}`)
    } else {
      res.render('404-error', {user});
    }

  });

  app.get('/signed-upload-url', async function(req, res) {
    const userId = req.signedCookies['userId'];

    if (!userId) {
      res.status(401);
      res.end('You must be logged in to add photos of businesses');
      return
    }

    const fileName = req.query['file-name'];
    const fileType = req.query['file-type'];
    const key = `${userId}-${new Date().getTime()}-${fileName.slice(0, 32)}`
    const data = await s3Client.getSignedURL(key, fileType);
    res.end(JSON.stringify(data));
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

function isGoogleId(id) {
  return /[a-z]/i.test(id)
}

function abbreviateAddress(address) {
  address = address.replace(/\s*\d+,\s*USA$/, '');
  return address;
}
