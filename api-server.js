const express = require('express');
const database = require("./src/database");
const bodyParser = require('body-parser');
const BusinessSearch = require('./src/business-search');

const app = express();

app.use(bodyParser.json());

app.get('/allcategorytitles', async function(req, res) {
  const data = await database.getAllCategoryTitles();
  res.end(JSON.stringify(data));
})

app.get('/:categoryName/allsubcategories', async function(req, res) {
  const data = await database.getSubcategoriesForCategory(req.params.categoryName);
  res.end(JSON.stringify(data));
})

app.get('/reviews/:id', async function(req, res) {
  const reviews = await database.getBusinessReviewsById(req.params.id);
  res.end(JSON.stringify(reviews));
})

app.get('/recentreviews', async function(req, res) {
  let recentReviews = await database.getRecentReviews();
  res.end(JSON.stringify(recentReviews));
})

app.get('/businesses/searchexisting?', async function(req, res) {
  const {term, latitude, longitude} = req.query

  let results = await search.searchForBusinesses(term, latitude, longitude);
  res.end(JSON.stringify({businesses: results}));
});

app.post('/businesses/postreview', async function(req, res) {
  let business = await database.getBusinessByGoogleId(req.body.businessGoogleId);

  await database.transact(async () => {
    if (!business) {
      const googleBusiness = await google.getBusinessById(req.body.businessGoogleId);

      business = {
        googleId: googleBusiness.place_id,
        name: googleBusiness.name,
        address1: googleBusiness.location.address1,
        address2: googleBusiness.location.address2,
        state: googleBusiness.location.state,
        city: googleBusiness.location.city,
        phoneNumber: googleBusiness.phone,
        latitude: googleBusiness.coordinates.latitude,
        longitude: googleBusiness.coordinates.longitude,
        categories: googleBusiness.categories
      };

      business.id = await database.createBusiness(business);
    }

    const reviewId = await database.createReview(business.id, req.body);

    await database.updateBusinessScore(business.id, req.body.fatFriendlyRating);

    res.end(JSON.stringify({reviewId: reviewId}));
  })
})

module.exports = app
