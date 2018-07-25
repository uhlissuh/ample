const express = require('express');
const database = require("./database");
const catchErrors = require('./catch-errors');
const basicAuth = require('express-basic-auth')
const expressLayout = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const assert = require('assert');

module.exports =
function (users) {
  const app = express();
  catchErrors(app);

  app.set('view engine', 'ejs');
  app.set('views', 'src/views');

  app.use(basicAuth({users, challenge: true}));
  app.use(expressLayout);
  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json());

  for (const user in users) {
    if (!users[user] || users[user].length < 10) {
      console.warn(`Missing admin password for user ${user}`);
      return app;
    }
  }

  app.get('/', async (req, res) => {
    const pendingTags = await database.getPendingTags();
    const allReviews = await database.getAllReviews();
    const businessesWithUnconfirmedOwners = await database.getBusinessesWithUnconfirmedOwners();
    console.log(businessesWithUnconfirmedOwners);
    allReviews.map(review => review.date = new Date(review.timestamp).toDateString())
    res.render('admin/admin-dashboard', { pendingTags, user: null, allReviews, businessesWithUnconfirmedOwners });
  });

  app.post('/approve-tag', async (req, res) => {
    const tag = req.body.tag;
    assert(tag.length > 0);
    await database.approveTag(tag);
    res.redirect('/admin');
  });

  app.post('/approve-owner', async (req, res) => {
    console.log("getting post");
    console.log("body", req.body);
    const businessId = req.body.businessId;

    await database.approveOwner(businessId);
    res.redirect('/admin');
  });

  return app;
};
