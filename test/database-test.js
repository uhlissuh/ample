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
        overallRating: null,
        reviewCount: 0,
        pocInclusivityAverageRating: null,
        pocInclusivityRatingCount: 0,
        bodyPositivityAverageRating: null,
        bodyPositivityRatingCount: 0,
        lgbtqInclusivityAverageRating: null,
        lgbtqInclusivityRatingCount: 0,
        furnitureSizeAverageRating: null,
        furnitureSizeRatingCount: 0,
        buildingAccessibilityAverageRating: null,
        buildingAccessibilityRatingCount: 0,
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
    let userId, businessId

    beforeEach(async () => {
      userId = await database.createUser({
        facebookId: '567',
        name: 'Bob Carlson',
        email: 'bob@example.com'
      })

      businessId = await database.createBusiness({
        googleId: "dr-brain",
        name: 'Dr Brain',
        address: '123 Main St',
        phone: '555-555-5555',
        latitude: 37.767423217936834,
        longitude: -122.42821739746094
      })
    });

    it("creates a review and updates the business's score", async () => {
      await database.createReview(userId, businessId, {
        content: "I love this person deeply.",
        bodyPositivity: 5,
        pocInclusivity: 2,
        lgbtqInclusivity: 5,
        buildingAccessibility: 5,
        furnitureSize: 5
      });

      assert.equal(
        (await database.getBusinessById(businessId)).bodyPositivityAverageRating,
        5
      )

      await database.createReview(userId, businessId, {
        content: "I hate.",
        bodyPositivity: 1,
        pocInclusivity: 4,
        lgbtqInclusivity: 3,
        buildingAccessibility: 1,
        furnitureSize: 1
      });

      const secondRating = (await database.getBusinessById(businessId)).bodyPositivityAverageRating;
      assert.equal(secondRating, 3);

      await database.createReview(userId, businessId, {
        content: "I pretty much love this person.",
        bodyPositivity: 5,
        pocInclusivity: 4,
        lgbtqInclusivity: 2,
        buildingAccessibility: 2,
        furnitureSize: 1
      });

      const thirdRating = (await database.getBusinessById(businessId)).bodyPositivityAverageRating
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

      assert.deepEqual(reviews.map(review => review.bodyPositivity).sort(), [1, 5, 5]);
    });

    it("allows ratings to be omitted", async () => {
      await database.createReview(userId, businessId, {
        content: "I love this person deeply.",
        bodyPositivity: 4,
        furnitureSize: 3,
        lgbtqInclusivity: NaN
      });

      const business = await database.getBusinessById(businessId);
      assert.equal(business.lgbtqInclusivityRatingCount, 0);
      assert.equal(business.lgbtqInclusivityAverageRating, null);
      assert.equal(business.bodyPositivityRatingCount, 1);
      assert.equal(business.bodyPositivityAverageRating, 4);
    });
  })

  describe(".getBusinessRatingBreakdown", () => {
    it("returns the number of users who gave the business each possible rating in each criteria", async () => {
      const userId1 = await database.createUser({
        facebookId: '1',
        name: 'Bob Carlson',
        email: 'bob@example.com'
      });

      const userId2 = await database.createUser({
        facebookId: '2',
        name: 'Rob Carlson',
        email: 'rob@example.com'
      });

      const userId3 = await database.createUser({
        facebookId: '3',
        name: 'Lob Carlson',
        email: 'lob@example.com'
      });

      const businessId = await database.createBusiness({
        googleId: "dr-brain",
        name: 'Dr Brain',
        address: '123 Main St',
        phone: '555-555-5555',
        latitude: 37.767423217936834,
        longitude: -122.42821739746094
      });

      let breakdown = await database.getBusinessRatingBreakdown(businessId);
      assert.deepEqual(breakdown.bodyPositivity, {
        1: {count: 0, percentage: 0},
        2: {count: 0, percentage: 0},
        3: {count: 0, percentage: 0},
        4: {count: 0, percentage: 0},
        5: {count: 0, percentage: 0},
        total: 0
      });

      await database.createReview(userId1, businessId, {
        content: "Cool.",
        bodyPositivity: 4,
        pocInclusivity: 3,
      });

      await database.createReview(userId2, businessId, {
        content: "Not as cool.",
        bodyPositivity: 4,
        pocInclusivity: 2,
      });

      await database.createReview(userId3, businessId, {
        content: "Really cool.",
        bodyPositivity: 5,
        pocInclusivity: 2,
      });

      breakdown = await database.getBusinessRatingBreakdown(businessId);
      assert.deepEqual(breakdown.bodyPositivity, {
        1: {count: 0, percentage: 0},
        2: {count: 0, percentage: 0},
        3: {count: 0, percentage: 0},
        4: {count: 2, percentage: 67},
        5: {count: 1, percentage: 33},
        total: 3
      });
      assert.deepEqual(breakdown.pocInclusivity, {
        1: {count: 0, percentage: 0},
        2: {count: 2, percentage: 67},
        3: {count: 1, percentage: 33},
        4: {count: 0, percentage: 0},
        5: {count: 0, percentage: 0},
        total: 3
      });
    });
  });

  describe(".updateReview", () => {
    let userId, businessId

    beforeEach(async () => {
      userId = await database.createUser({
        facebookId: '567',
        name: 'Bob Carlson',
        email: 'bob@example.com'
      });

      const otherUserId = await database.createUser({
        facebookId: '890',
        name: 'Rob Carlson',
        email: 'rob@example.com'
      });

      businessId = await database.createBusiness({
        googleId: "dr-brain",
        name: 'Dr Brain',
        address: '123 Main St',
        phone: '555-555-5555',
        latitude: 37.767423217936834,
        longitude: -122.42821739746094
      });

      await database.createReview(otherUserId, businessId, {
        content: "Meh.",
        bodyPositivity: 3,
        lgbtqInclusivity: 3,
      });

      reviewId = await database.createReview(userId, businessId, {
        content: "I love this person deeply.",
        bodyPositivity: 4,
        buildingAccessibility: 4,
        furnitureSize: 4
      });
    });

    it("updates an existing review and updates the business review information", async() => {
      let business = await database.getBusinessById(businessId);
      assert.equal(business.bodyPositivityRatingCount, 2);
      assert.equal(business.bodyPositivityAverageRating, 3.5);
      assert.equal(business.lgbtqInclusivityRatingCount, 1);
      assert.equal(business.lgbtqInclusivityAverageRating, 3);
      assert.equal(business.furnitureSizeRatingCount, 1);
      assert.equal(business.furnitureSizeAverageRating, 4);

      await database.updateReview(reviewId, {
        content: "I actually love this person more than I even thought was possible.",
        bodyPositivity: 5,
        lgbtqInclusivity: 1,
      });

      const updatedReview = await database.getReviewById(reviewId);
      business = await database.getBusinessById(businessId);

      assert.equal(updatedReview.content, 'I actually love this person more than I even thought was possible.')
      assert.equal(updatedReview.bodyPositivity, 5);
      assert.equal(updatedReview.lgbtqInclusivity, 1);
      assert.equal(updatedReview.pocInclusivity, null);
      assert.equal(updatedReview.buildingAccessibility, null);
      assert.equal(updatedReview.furnitureSize, null);

      assert.equal(business.bodyPositivityRatingCount, 2);
      assert.equal(business.bodyPositivityAverageRating, 4);
      assert.equal(business.lgbtqInclusivityRatingCount, 2);
      assert.equal(business.lgbtqInclusivityAverageRating, 2);
      assert.equal(business.furnitureSizeRatingCount, 0);
      assert.equal(business.furnitureSizeAverageRating, null);
      assert.equal(business.buildingAccessibilityRatingCount, 0);
      assert.equal(business.buildingAccessibilityAverageRating, null);
    });
  });

  describe(".createUser", () => {
    it("allows the user to be retrieved afterwards", async () => {
      const id = await database.createUser({
        facebookId: '5',
        name: 'John Smith',
        email: 'john@example.com',
      });

      const user = await database.getUserById(id)
      assert.deepEqual(user, {
        id,
        facebookId: '5',
        name: 'John Smith',
        email: 'john@example.com',
      })
    });
  });

  describe(".getProfileInformationForUser", () => {
    it("gets reviews the user has made", async () => {
      const id = await database.createUser({
        facebookId: '5',
        name: 'John Smith',
        email: 'john@example.com',
      });

      const businessId1 = await database.createBusiness({
        googleId: "dr-brain",
        name: 'Dr Brain',
        address: '123 Main St',
        phone: '555-555-5555',
        latitude: 37.767423217936834,
        longitude: -122.42821739746094
      });

      const businessId2 = await database.createBusiness({
        googleId: "dr-coffee",
        name: 'Dr coffee',
        address: '123 South St',
        phone: '333-555-5555',
        latitude: 37.346923217936834,
        longitude: -122.3456739746094
      });

      const review1 = await database.createReview(id, businessId1, {
        content: "Cool.",
        bodyPositivity: 4,
        pocInclusivity: 3,
      });

      const review2 = await database.createReview(id, businessId2, {
        content: "BAD.",
        bodyPositivity: 1,
        pocInclusivity: 1,
      });


      const profileInfo = await database.getProfileInformationForUser(id);

      profileInfo.reviews.sort();
      const reviewsContent = [];
      const reviewsBodyPositivity = []
      for (review of profileInfo.reviews) {
        reviewsContent.push(review.content);
        reviewsBodyPositivity.push(review.bodyPositivity);
      }

      assert.deepEqual(reviewsContent, ['Cool.', "BAD."]);
      assert.deepEqual(reviewsBodyPositivity, [4, 1]);
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
        email: 'harold@example.com'
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
      });
    });
  });
});
