const database = require('./database');

module.exports =
class BusinessSearch {
  constructor(googlePlacesClient) {
    this.googlePlacesClient = googlePlacesClient;
  }

  async findBusinesses(term, locationName, page) {
    const {lat, lng} = await this.googlePlacesClient.getCoordinatesForLocationName(locationName);
    return this.findBusinessesForLocation(term, lat, lng, page);
  }

  async findBusinessesForLocation(term, lat, lng, page) {

    if (database.hasCategory(term)) {
      const businesses = await database.getBusinessesByCategoryandLocation(
        term,
        lat,
        lng,
        page
      );
      return businesses;
    } else {
      return null;
    }
  }

  // async findBusinessesForLocation(term, lat, lng) {
  //   const googleBusinesses = await this.googlePlacesClient.getBusinessesNearCoordinates(
  //     term,
  //     lat,
  //     lng
  //   );
  //
  //   if (googleBusinesses.length === 0) return [];
  //
  //   const ratedBusinesses = await database.getBusinessesByGoogleIds(
  //     googleBusinesses.map(business => business.place_id)
  //   );
  //
  //   const ratedBusinessesByGoogleId = {};
  //   for (const ratedBusiness of ratedBusinesses) {
  //     ratedBusinessesByGoogleId[ratedBusiness.googleId] = ratedBusiness
  //   }
  //
  //   const results = googleBusinesses.map(googleBusiness => {
  //
  //     const ratedBusiness = ratedBusinessesByGoogleId[googleBusiness.place_id];
  //     const photoReference = googleBusiness.photos ? googleBusiness.photos[0].photo_reference : null
  //     return Object.assign({}, {
  //       googleId: googleBusiness.place_id,
  //       name: googleBusiness.name,
  //       photoURL: photoReference ? this.googlePlacesClient.getPhotoURL(photoReference, 300, 300) : null,
  //       address: googleBusiness.vicinity,
  //       reviewCount: 0,
  //       overallRating: 0
  //     }, ratedBusiness);
  //   });
  //
  //   if (database.hasCategory(term)) {
  //     const nearbyBusinesses = await database.getBusinessesByCategoryandLocation(
  //       term,
  //       lat,
  //       lng
  //     );
  //
  //     for (const nearbyBusiness of nearbyBusinesses) {
  //       if (!results.some(result => result.googleId === nearbyBusiness.googleId)) {
  //         results.push(nearbyBusiness);
  //       }
  //     }
  //   } else {
  //     const addedBusinesses = await database.searchAddedBusinesses(term, lat, lng);
  //     for (const business of addedBusinesses) {
  //       results.push(business);
  //     }
  //   }
  //
  //   return results.sort((a, b) => {
  //     if (a.overallRating > b.overallRating) return -1;
  //     if (b.overallRating > a.overallRating) return 1;
  //     if (a.takenPledge && !b.takenPledge) return -1;
  //     if (b.takenPledge && !a.takenPledge) return 1;
  //     if (a.amplifierId && !b.amplifierId) return -1;
  //     if (b.amplifierId && !a.amplifierId) return 1;
  //     if (!a.googleId && b.googleId) return -1;
  //     if (!b.googleId && a.googleId) return 1;
  //     return 0;
  //   });
  // }
};
