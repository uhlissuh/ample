const yelp = require('./yelp');
const database = require('./database');

exports.searchForBusinesses = async function(category, latitude, longitude) {
  const alias = await database.getAliasForCategoryTitle(category);
  const existingNearbyBusinesses = await database.getExistingBusinessesByCategoryandLocation(alias, latitude, longitude);
  const yelpResponse = await yelp.getBusinessesByCategoryAndLocation(category, latitude, longitude);
  const yelpBusinesses = yelpResponse.businesses;
  console.log(yelpBusinesses[0]);
  const reformattedYelpBusinesses = yelpBusinesses.map(business => {
    id: null,
    name: business.name,
    location: business.coordinates,
    phone_number: business.phone,
    city: business.city,
    state: business.state,
    address1: business.location.address1,
    address2: business.location.address2,
    yelp_id: business.id,
    score: null,
    category_titles: business.categories.map(category => {
      return category.title;
    })
  })

  reformattedYelpBusinesses.sort(function(a, b) {
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

  let yelpBusinessesExcludingExisting = reformattedYelpBusinesses.filter(function(business) {
    return !existingNearbyBusinesses.some(function(existingBusiness){
      return business.yelpId == existingBusiness.yelp_id
    });
  });

  return existingNearbyBusinesses.concat(yelpBusinessesExcludingExisting);
}
