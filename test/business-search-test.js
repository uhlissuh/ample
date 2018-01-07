require("./test-helper");
const assert = require('assert');
const database = require("../src/database");
const BusinessSearch = require("../src/business-search");

describe("BusinessSearch", () => {
  beforeEach(async () => {
    await database.clear();
  });

  it("finds businesses near the given location", async () => {
    const userId = await database.createUser({
      name: 'user 1'
    });

    const googlePlacesClient = {
      async getCoordinatesForLocationName(locationName) {
        return {
          lat: 45.6,
          lng: -122.3
        };
      },

      async getBusinessesNearCoordinates(term, latitude, longitude) {
        assert.equal(term, 'hair stylist');
        assert.equal(latitude, 45.6);
        assert.equal(longitude, -122.3);

        return [
          {
            place_id: "stylist-0-id",
            name: "Iris Hair Salon",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            types: [
              "hair_care",
              "beauty_salon",
              "health",
              "point_of_interest",
              "establishment"
            ],
            vicinity: "Address 0"
          },
          {
            place_id: "stylist-1-id",
            name: "Hibiscus Hair Salon",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            types: [
              "hair_care",
              "beauty_salon",
              "health",
              "point_of_interest",
              "establishment"
            ],
            vicinity: "Address 1"
          },
          {
            place_id: "stylist-2-id",
            name: "Hyacinth Hair Salon",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            types: [
              "hair_care",
              "beauty_salon",
              "health",
              "point_of_interest",
              "establishment"
            ],
            vicinity: "Address 2"
          }
        ];
      }
    };

    const businessId1 = await database.createBusiness({
      name: "Stylist 1",
      googleId: "stylist-1-id"
    });
    const businessId2 = await database.createBusiness({
      name: "Stylist 2",
      googleId: "stylist-2-id"
    });
    const businessId3 = await database.createBusiness({
      name: "Stylist 3",
      googleId: "stylist-3-id"
    });

    await database.createReview(userId, businessId1, {
      content: 'mediocre stylist.',
      rating: 30,
    });
    await database.createReview(userId, businessId2, {
      content: 'awesome stylist.',
      rating: 60,
    });

    const search = new BusinessSearch(googlePlacesClient);
    const businesses = await search.findBusinesses(
      "hair stylist",
      "North Mississipi Ave, Portland, OR"
    );

    assert.deepEqual(businesses.map(b => b.name), [
      'Stylist 2',
      'Stylist 1',
      'Iris Hair Salon'
    ]);
  });
});
