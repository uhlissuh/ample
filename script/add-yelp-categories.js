#!/usr/bin/env node

const yelpCategories = require('../categories.json');
const db = require('../src/database');


db.addYelpCategories(yelpCategories).then(() => {
  console.log("successfully entered in Yelp Categories!");
});
