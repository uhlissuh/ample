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
      const photoReference = googleBusiness.photos ? googleBusiness.photos[0].photo_reference : null
      return Object.assign({}, {
        googleId: googleBusiness.place_id,
        name: googleBusiness.name,
        photoURL: photoReference ? this.googlePlacesClient.getPhotoURL(photoReference, 80, 80) : null,
        vicinity: googleBusiness.vicinity,
        reviewCount: 0
      }, ratedBusiness);
    });

    return results.sort((a, b) =>
      (b.overallRating || -Infinity) - (a.overallRating || -Infinity)
    );
  }
};
