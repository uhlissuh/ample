const database = require('./database');

module.exports =
class BusinessSearch {
  constructor(googlePlacesClient) {
    this.googlePlacesClient = googlePlacesClient;
  }

  async findBusinesses(term, locationName) {
    const {lat, lng} = await this.googlePlacesClient.getCoordinatesForLocationName(locationName);
    const googleBusinesses = await this.googlePlacesClient.getBusinessesNearCoordinates(
      term,
      lat,
      lng
    );

    const ratedBusinesses = await database.getBusinessesByGoogleIds(
      googleBusinesses.map(business => business.place_id)
    );

    ratedBusinesses.sort((a, b) => b.rating - a.rating);

    return ratedBusinesses.concat(
      googleBusinesses.filter(googleBusiness =>
        ratedBusinesses.every(ratedBusiness =>
          ratedBusiness.googleId !== googleBusiness.place_id
        )
      )
    );
  }
};
