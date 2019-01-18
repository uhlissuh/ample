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
      "North Mississippi Ave, Portland, OR"
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

  // it("finds businesses near the given location", async () => {
  //   const googlePlacesClient = {
  //     async getCoordinatesForLocationName(locationName) {
  //       return {
  //         lat: 45.6,
  //         lng: -122.3
  //       };
  //     },
  //
  //     getPhotoURL(photoReference) {
  //       return `http://google.com/${photoReference}`
  //     },
  //
  //     async getBusinessesNearCoordinates(term, latitude, longitude) {
  //       assert.equal(term, 'hair stylist');
  //       assert.equal(latitude, 45.6);
  //       assert.equal(longitude, -122.3);
  //
  //       return [
  //         {
  //           place_id: "stylist-0-id",
  //           name: "Stylist 0",
  //           geometry: {
  //             location: {
  //               lat: 45.49974739999999,
  //               lng: -122.4294706
  //             }
  //           },
  //           photos: [
  //             {
  //               photo_reference: 'stylist-0-photo-reference'
  //             }
  //           ],
  //           types: [
  //             "hair_care",
  //             "beauty_salon",
  //             "establishment"
  //           ],
  //           vicinity: "Address 0"
  //         },
  //         {
  //           place_id: "stylist-1-id",
  //           name: "Stylist 1",
  //           geometry: {
  //             location: {
  //               lat: 45.49974739999999,
  //               lng: -122.4294706
  //             }
  //           },
  //           photos: [
  //             {
  //               photo_reference: 'stylist-1-photo-reference'
  //             }
  //           ],
  //           types: [
  //             "hair_care",
  //             "beauty_salon",
  //             "establishment"
  //           ],
  //           vicinity: "Address 1"
  //         },
  //         {
  //           place_id: "stylist-2-id",
  //           name: "Stylist 2",
  //           geometry: {
  //             location: {
  //               lat: 45.49974739999999,
  //               lng: -122.4294706
  //             }
  //           },
  //           photos: [
  //             {
  //               photo_reference: 'stylist-2-photo-reference'
  //             }
  //           ],
  //           types: [
  //             "hair_care",
  //             "beauty_salon",
  //             "establishment"
  //           ],
  //           vicinity: "Address 2"
  //         }
  //       ];
  //     }
  //   };
  //
  //   const businessId1 = await database.createBusiness({
  //     name: "Stylist 1",
  //     googleId: "stylist-1-id",
  //
  //   });
  //   const businessId2 = await database.createBusiness({
  //     name: "Stylist 2",
  //     googleId: "stylist-2-id"
  //   });
  //   const businessId3 = await database.createBusiness({
  //     name: "Stylist 3",
  //     googleId: "stylist-3-id"
  //   });
  //
  //   await database.createReview(userId, businessId1, {
  //     content: 'mediocre stylist.',
  //     fatRating: 2,
  //     transRating: 1,
  //     disabledRating: 2,
  //     categories: ['Beauty']
  //   });
  //   await database.createReview(userId, businessId2, {
  //     content: 'awesome stylist.',
  //     fatRating: 4,
  //     transRating: 5,
  //     disabledRating: 5,
  //     categories: ['Beauty']
  //   });
  //
  //   const search = new BusinessSearch(googlePlacesClient);
  //   const businesses = await search.findBusinesses(
  //     "hair stylist",
  //     "North Mississipi Ave, Portland, OR"
  //   );
  //
  //   assert.deepEqual(businesses.map(b => b.name), [
  //     'Stylist 2',
  //     'Stylist 1',
  //     'Stylist 0'
  //   ]);
  //   assert.deepEqual(businesses.map(b => b.reviewCount), [
  //     1,
  //     1,
  //     0
  //   ]);
  //   assert.deepEqual(businesses.map(b => b.photoURL), [
  //     'http://google.com/stylist-2-photo-reference',
  //     'http://google.com/stylist-1-photo-reference',
  //     'http://google.com/stylist-0-photo-reference'
  //   ]);
  // });

  // it("returns empty array when no businesses are found on google", async () => {
  //   const googlePlacesClient = {
  //     async getBusinessesNearCoordinates() {
  //       return [];
  //     }
  //   };
  //
  //   const search = new BusinessSearch(googlePlacesClient);
  //   const businesses = await search.findBusinessesForLocation('behaul', 42, -122);
  //   assert.deepEqual(businesses, []);
  // });
  //
  // describe("when searching for a known category", () => {
  //   it("ensures that any reviewed businesses w/ that category remotely nearby are included", async () => {
  //     const businessId1 = await database.createBusiness({
  //       name: "Beaverton Stylist",
  //       googleId: "stylist-1-id",
  //       latitude: 45.4871,
  //       longitude: -122.8037
  //     });
  //     const businessId2 = await database.createBusiness({
  //       name: "Gresham Stylist",
  //       googleId: "stylist-2-id",
  //       latitude: 45.5059,
  //       longitude: -122.4486
  //     });
  //     const businessId3 = await database.createBusiness({
  //       name: "Arcata Stylist",
  //       googleId: "stylist-3-id",
  //       latitude: 40.8665,
  //       longitude: -124.0828
  //     });
  //
  //     await database.createReview(userId, businessId1, {
  //       content: 'a good stylist.',
  //       fatRating: 5,
  //       categories: ['Beauty']
  //     });
  //     await database.createReview(userId, businessId2, {
  //       content: 'a very good stylist.',
  //       fatRating: 4,
  //       categories: ['Beauty']
  //     });
  //     await database.createReview(userId, businessId3, {
  //       content: 'a kewl stylist.',
  //       fatRating: 4,
  //       categories: ['Beauty']
  //     });
  //
  //     const googlePlacesClient = {
  //       async getBusinessesNearCoordinates(term, latitude, longitude) {
  //         return [
  //           {
  //             place_id: "stylist-4-id",
  //             name: "Portland Stylist",
  //             geometry: {
  //               location: {
  //                 lat: 45.5232,
  //                 lng: -122.6766
  //               }
  //             },
  //             photos: [
  //               {
  //                 photo_reference: 'stylist-4-photo-reference'
  //               }
  //             ],
  //             types: ["hair_care"],
  //             vicinity: "Address 4"
  //           },
  //           {
  //             place_id: "stylist-2-id",
  //             name: "Gresham Stylist",
  //             geometry: {
  //               location: {
  //                 lat: 45.5059,
  //                 lng: -122.4486
  //               }
  //             },
  //             photos: [
  //               {
  //                 photo_reference: 'stylist-2-photo-reference'
  //               }
  //             ],
  //             types: ["hair_care"],
  //             vicinity: "Address 2"
  //           },
  //         ]
  //       },
  //
  //       getPhotoURL() {
  //         return 'the-url'
  //       }
  //     };
  //
  //     const search = new BusinessSearch(googlePlacesClient);
  //
  //     const businesses = await search.findBusinessesForLocation('beauty', 45.5231, -122.6765);
  //
  //     assert.deepEqual(businesses.map(business => business.name), [
  //       'Beaverton Stylist',
  //       'Gresham Stylist',
  //       'Portland Stylist'
  //     ]);
  //   });
  // });
});
