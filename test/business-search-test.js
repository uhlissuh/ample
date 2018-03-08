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

      getPhotoURL(photoReference) {
        return `http://google.com/${photoReference}`
      },

      async getBusinessesNearCoordinates(term, latitude, longitude) {
        assert.equal(term, 'hair stylist');
        assert.equal(latitude, 45.6);
        assert.equal(longitude, -122.3);

        return [
          {
            place_id: "stylist-0-id",
            name: "Stylist 0",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            photos: [
              {
                photo_reference: 'stylist-0-photo-reference'
              }
            ],
            types: [
              "hair_care",
              "beauty_salon",
              "establishment"
            ],
            vicinity: "Address 0"
          },
          {
            place_id: "stylist-1-id",
            name: "Stylist 1",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            photos: [
              {
                photo_reference: 'stylist-1-photo-reference'
              }
            ],
            types: [
              "hair_care",
              "beauty_salon",
              "establishment"
            ],
            vicinity: "Address 1"
          },
          {
            place_id: "stylist-2-id",
            name: "Stylist 2",
            geometry: {
              location: {
                lat: 45.49974739999999,
                lng: -122.4294706
              }
            },
            photos: [
              {
                photo_reference: 'stylist-2-photo-reference'
              }
            ],
            types: [
              "hair_care",
              "beauty_salon",
              "establishment"
            ],
            vicinity: "Address 2"
          }
        ];
      }
    };

    const businessId1 = await database.createBusiness({
      name: "Stylist 1",
      googleId: "stylist-1-id",

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
      bodyPositivity: 2,
      pocInclusivity: 1,
      lgbtqInclusivity: 1,
      buildingAccessibility: 2,
      furnitureSize: 2
    });
    await database.createReview(userId, businessId2, {
      content: 'awesome stylist.',
      bodyPositivity: 4,
      pocInclusivity: 4,
      lgbtqInclusivity: 5,
      buildingAccessibility: 5,
      furnitureSize: 4
    });

    const search = new BusinessSearch(googlePlacesClient);
    const businesses = await search.findBusinesses(
      "hair stylist",
      "North Mississipi Ave, Portland, OR"
    );

    assert.deepEqual(businesses.map(b => b.name), [
      'Stylist 2',
      'Stylist 1',
      'Stylist 0'
    ]);

    assert.deepEqual(businesses.map(b => b.reviewCount), [
      1,
      1,
      0
    ]);
    assert.deepEqual(businesses.map(b => b.photoURL), [
      'http://google.com/stylist-2-photo-reference',
      'http://google.com/stylist-1-photo-reference',
      'http://google.com/stylist-0-photo-reference'
    ]);
  });
});
