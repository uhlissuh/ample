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

    const ratedBusinessesByGoogleId = {};
    for (const ratedBusiness of ratedBusinesses) {
      ratedBusinessesByGoogleId[ratedBusiness.googleId] = ratedBusiness
    }

    const results = googleBusinesses.map(googleBusiness => {
      const ratedBusiness = ratedBusinessesByGoogleId[googleBusiness.place_id];
      return {
        placeId: googleBusiness.place_id,
        name: googleBusiness.name,
        photoReference: googleBusiness.photos[0].photo_reference,
        vicinity: googleBusiness.vicinity,
        rating: ratedBusiness ? ratedBusiness.rating : null,
        reviewCount: ratedBusiness ? ratedBusiness.reviewCount : 0
      };
    });

    return results.sort((a, b) => b.rating - a.rating);
  }
};
