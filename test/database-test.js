require('./test-helper');
const assert = require('assert');
const database = require('../src/database');

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
        facebookId: '567',
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
        rating: 5,
        sturdySeating: true,
        armlessChairs: false,
        wideTableSpacing: false,
        wideTable: false,
        benchSeating: true,
        wheelchair: true,
        dedicatedParking: true,
        handicapParking: true,
        stairsRequired: false,
        weightNeutral: false,
        haes: false,
        fatPositive: true,
        lgbtq: false,
        transFriendly: false,
        pocCentered: false
      });
      assert.equal((await database.getBusinessById(businessId)).rating, 5)

      await database.createReview(userId, businessId, {
        content: "I hate.",
        rating: 1,
        sturdySeating: true,
        armlessChairs: false,
        wideTableSpacing: false,
        wideTable: false,
        benchSeating: true,
        wheelchair: false,
        dedicatedParking: false,
        handicapParking: true,
        stairsRequired: false,
        weightNeutral: false,
        haes: false,
        fatPositive: true,
        lgbtq: false,
        transFriendly: false,
        pocCentered: false
      });

      const secondRating = (await database.getBusinessById(businessId)).rating;
      assert.equal(secondRating, 3);

      await database.createReview(userId, businessId, {
        content: "I pretty much love this person.",
        rating: 5,
        sturdySeating: true,
        armlessChairs: false,
        wideTableSpacing: false,
        wideTable: false,
        benchSeating: true,
        wheelchair: false,
        dedicatedParking: false,
        handicapParking: true,
        stairsRequired: true,
        weightNeutral: false,
        haes: false,
        fatPositive: true,
        lgbtq: false,
        transFriendly: false,
        pocCentered: true
      });

      const thirdRating = Math.round(((await database.getBusinessById(businessId)).rating * 10)) / 10
      assert.equal(thirdRating, 3.7)

      const reviews = await database.getBusinessReviewsById(businessId);

      assert.deepEqual(reviews.map(review => review.content).sort(), [
        'I hate.',
        'I love this person deeply.',
        'I pretty much love this person.'
      ]);

      assert.deepEqual(reviews[0].user, {
        name: 'Bob Carlson',
        id: userId
      })

      assert.deepEqual(reviews.map(review => review.stairsRequired).sort(), [false, false, true]);
    });
  })

  describe(".createUser", () => {
    it("allows the user to be retrieved afterwards", async () => {
      const id = await database.createUser({
        facebookId: '5',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '123-456-7890'
      });

      const user = await database.getUserById(id)
      assert.deepEqual(user, {
        id,
        facebookId: '5',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '123-456-7890'
      })
    });
  });

  describe(".findOrCreateUser", () => {
    it("creates a user when none exists with the given facebook id", async () => {
      const id = await database.findOrCreateUser({
        facebookId: '123',
        name: 'Harold',
        email: 'harold@example.com'
      });

      assert.deepEqual(await database.getUserById(id), {
        id,
        facebookId: '123',
        name: 'Harold',
        email: 'harold@example.com',
        phone: null
      });
    });

    it("updates a user if one already exists with the given facebook id", async () => {
      const id1 = await database.findOrCreateUser({
        facebookId: '123',
        name: 'Harold',
        email: 'harold@example.com'
      });

      const id2 = await database.findOrCreateUser({
        facebookId: '123',
        name: 'Shmarold',
        email: 'shmarold@example.com'
      });

      assert.equal(id2, id1);

      assert.deepEqual(await database.getUserById(id1), {
        id: id1,
        facebookId: '123',
        name: 'Shmarold',
        email: 'shmarold@example.com',
        phone: null
      });
    });
  });
});
