const yelp = require('./yelp');
const database = require('./database');

exports.searchForBusinesses = async function(category, latitude, longitude) {
  const existingNearbyBusinesses = await database.getExistingBusinessesByCategoryandLocation(category, latitude, longitude);
  const yelpBusinesses = await yelp.getBusinessesByCategoryAndLocation(category, latitude, longitude);

  yelpBusinesses.sort(function(a, b) {
    let nameA = a.name.toUpperCase();
    let nameB = b.name.toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
    return 1;
    }
    return 0;
  })

  let yelpBusinessesExcludingExisting = yelpBusinesses.filter(function(business) {
    if (business.yelpId != existingNearbyBusinesses[0].yelp_id) {
      return business;
    }
  });
  return existingNearbyBusinesses.concat(yelpBusinessesExcludingExisting);
}
