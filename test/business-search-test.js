require("./test-helper");
const assert = require('assert');
const database = require("../src/database");
const BusinessSearch = require("../src/business-search");

describe("BusinessSearch", () => {
  let userId;

  beforeEach(async () => {
    await database.clear();
    userId = await database.createUser({
      name: 'user 1',
      email: 'user1@example.com',
      googleId: '123'
    });
  });

  it("finds reviewed, claimed, or amplified businesses near given location", async() => {
    const googlePlacesClient = {
      async getCoordinatesForLocationName(locationName) {
        return {
          lat: 45.60,
          lng: -122.30
        }
      }
    }

    const businessId1 = await database.createBusiness({
      name: "Stylist 1",
      googleId: "stylist-1-id",
      latitude: 47.0,
      longitude: -124.0
    });


    const businessId2 = await database.createBusiness({
      name: "Stylist 2",
      googleId: "stylist-2-id",
      latitude: 45.70,
      longitude: -122.40
    });

    const businessId3 = await database.createBusiness({
      name: "Stylist 3",
      googleId: "stylist-3-id",
      latitude: 45.80,
      longitude: -122.50
    });

    const businessId4 = await database.createBusiness({
      name: "Stylist 4",
      googleId: "stylist-4-id",
      latitude: 45.60,
      longitude: -122.30
    });

    await database.createReview(userId, businessId1, {
      content: 'mediocre stylist.',
      fatRating: 2,
      transRating: 1,
      disabledRating: 2,
      categories: ['Beauty']
    });
    await database.createReview(userId, businessId2, {
      content: 'awesome stylist.',
      fatRating: 4,
      transRating: 5,
      disabledRating: 5,
      categories: ['Beauty']
    });
    await database.createReview(userId, businessId3, {
      content: 'wow stylist.',
      fatRating: 4,
      transRating: 5,
      disabledRating: 5,
      categories: ['Beauty']
    });
    await database.createReview(userId, businessId4, {
      content: 'amazeballs stylist.',
      fatRating: 4,
      transRating: 5,
      disabledRating: 5,
      categories: ['Beauty']
    });


    const search = new BusinessSearch(googlePlacesClient);
    const businesses = (await search.findBusinesses(
      "Beauty",
      "North Mississippi Ave, Portland, OR",
      1,
      20
    )).businesses;




    assert.deepEqual(businesses.map(b => b.name), [
      'Stylist 4',
      'Stylist 2',
      'Stylist 3',
      'Stylist 1'
    ]);
    assert.deepEqual(businesses.map(b => b.reviewCount), [
      1,
      1,
      1,
      1
    ]);
  })
});
