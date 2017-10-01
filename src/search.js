const yelp = require('./yelp');
const database = require('./database');

exports.searchForBusinesses = async function(category, latitude, longitude) {
  const existingNearbyBusinesses = await database.getExistingBusinessesByCategoryandLocation(category, latitude, longitude);
  const yelpBusinesses = await yelp.getBusinessesByCategoryAndLocation(category, latitude, longitude);

  return existingNearbyBusinesses.concat(yelpBusinesses);
}
