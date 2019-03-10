const database = require('./database');

module.exports =
class BusinessSearch {
  constructor(googlePlacesClient) {
    this.googlePlacesClient = googlePlacesClient;
  }

  async findBusinesses(term, locationName, page, limit) {
    const {lat, lng} = await this.googlePlacesClient.getCoordinatesForLocationName(locationName);
    return this.findBusinessesForLocation(term, lat, lng, page, limit);
  }

  async findBusinessesForLocation(term, lat, lng, page, limit) {

    if (database.hasCategory(term)) {
      const businessesData = await database.getBusinessesByCategoryandLocation(
        term,
        lat,
        lng,
        page,
        limit
      );

      return businessesData;
    } else {
      return null;
    }
  }
};
