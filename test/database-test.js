const database = require('../src/database');
const assert = require('assert');
require('./test-helper');

describe("database", () => {
  beforeEach(async () => {
    await database.clear();
  })

  describe(".createBusiness", () => {
    it("allows the business to be retrieved later", async () => {
      const id = await database.createBusiness({
        googleId: '5',
        name: "Solae's Lounge",
        address: '123 alberta',
        phone: '123-456-7890',
        latitude: 37.76,
        longitude: -122.42
      });

      const business = await database.getBusinessById(id);

      assert.deepEqual(business, {
        id,
        googleId: '5',
        name: "Solae's Lounge",
        address: '123 alberta',
        phone: '123-456-7890',
        latitude: 37.76,
        longitude: -122.42,
        rating: null,
        reviewCount: null
      })

      assert.deepEqual(await database.getBusinessByGoogleId('5'), business)
    });
  });

  describe(".getBusinessesByGoogleIds", () => {
    it("retrieves the businesses with the given google ids", async () => {
      const ids = [
        await database.createBusiness({
          googleId: '101',
          name: "Business 1",
          latitude: 37.76,
          longitude: -122.42
        }),
        await database.createBusiness({
          googleId: '102',
          name: "Business 2",
          latitude: 37.76,
          longitude: -122.42
        }),
        await database.createBusiness({
          googleId: '103',
          name: "Business 3",
          latitude: 37.76,
          longitude: -122.42
        }),
      ]

      const businesses = await database.getBusinessesByGoogleIds(['101', '103'])
      assert.deepEqual(businesses.map(business => business.name).sort(), [
        'Business 1',
        'Business 3'
      ])
    });
  });

  describe(".createReview", () => {
    it("creates a review and updates the business's score", async () => {
      const userId = await database.createUser({
        accountKitId: '567',
        name: 'Bob Carlson',
        phone: '123-456-7890',
        email: 'bob@example.com'
      })

      const businessId = await database.createBusiness({
        googleId: "dr-brain",
        name: 'Dr Brain',
        address: '123 Main St',
        phone: '555-555-5555',
        latitude: 37.767423217936834,
        longitude: -122.42821739746094
      })

      await database.createReview(userId, businessId, {
        content: "I love this person deeply.",
        rating: 90
      });
      assert.equal((await database.getBusinessById(businessId)).rating, 90)

      await database.createReview(userId, businessId, {
        content: "I hate.",
        rating: 30
      });
      assert.equal((await database.getBusinessById(businessId)).rating, 60)

      await database.createReview(userId, businessId, {
        content: "I pretty much love this person.",
        rating: 66
      });
      assert.equal((await database.getBusinessById(businessId)).rating, 62)

      const reviews = await database.getBusinessReviewsById(businessId);
      assert.deepEqual(reviews.map(review => review.content).sort(), [
        'I hate.',
        'I love this person deeply.',
        'I pretty much love this person.'
      ]);

      assert.deepEqual(reviews[0].user, {
        accountKitId: '567',
        name: 'Bob Carlson',
        id: userId
      })
    });
  })

  describe(".createUser", () => {
    it("allows the user to be retrieved afterwards", async () => {
      await database.createUser({
        accountKitId: '5',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '123-456-7890'
      });

      let user = await database.getUserByAccountKitId('4')
      assert.equal(user, null)

      user = await database.getUserByAccountKitId('5')
      assert.deepEqual(user, {
        accountKitId: '5',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '123-456-7890'
      })
    });
  });
});
