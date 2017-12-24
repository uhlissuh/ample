const database = require('../src/database');
const assert = require('assert');

database.connect("test");

describe("database", () => {
  beforeEach(async () => {
    await database.addYelpCategories([
      {
        "alias": "endocrinologists",
        "title": "Endocrinologists",
        "parents": [
          "physicians"
        ]
      },
      {
        "alias": "surgeons",
        "title": "Surgeons",
        "parents": [
          "physicians"
        ]
      },
      {
        "alias": "physicians",
        "title": "Doctors",
        "parents": [
          "health"
        ]
      },
      {
        "alias": "gastroenterologist",
        "title": "Gastroenterologist",
        "parents": [
          "physicians"
        ]
      },
      {
        "alias": "podiatrists",
        "title": "Podiatrists",
        "parents": [
          "physicians"
        ]
      }
    ])

    await database.createBusiness({
      yelpId: "dr-brain",
      name: "Dr. Brain",
      address1: "375 Valencia St",
      address2: "Suite 3",
      state: "CA",
      city: "San Francisco",
      phoneNumber: "444-342-4532",
      latitude: 37.767413217936834,
      longitude: -122.42820739746094,
      categories: [
        {
          "alias": "endocrinologists",
          "title": "Endocrinologists"
        },
        {
          "alias": "podiatrists",
          "title": "Podiatrists"
        }
      ]
    });
    await database.createBusiness({
      yelpId: "dr-seagull",
      name: "Dr. Seagull",
      address1: "432 Mission St",
      state: "CA",
      city: "San Francisco",
      phoneNumber: "444-342-4532",
      latitude: 37.767423217936834,
      longitude: -122.42821739746094,
      categories: [
        {
          "alias": "surgeons",
          "title": "Surgeons"
        },
        {
          "alias": "podiatrists",
          "title": "Podiatrists"
        }
      ]
    });
    await database.createBusiness({
      yelpId: "dr-bob",
      name: "Dr. Bob",
      address1: "432 Geurrero St",
      state: "XX",
      city: "Wherever",
      phoneNumber: "434-342-4511",
      latitude: -37.767423227936834,
      longitude: -122.42822739746094,
      categories: [
        {
          "alias": "gastroenterologist",
          "title": "Gastroenterologist"
        }
      ]
    });
  })

  afterEach(async () => {
    await database.clearCategories();
    await database.clearBusinessesAndBusinessCategories();
    await database.clearReviews();
  })

  it("creates three businesses", async () => {

    const entry = await database.getBusinessByYelpId("dr-brain");
    const drBrainName = entry.name;

    assert.deepEqual(drBrainName, "Dr. Brain");

    const categoryIds = await database.getCategoriesforBusinessId(entry.id);
    const categoryRows = await database.getCategoriesById(categoryIds);
    const categoryTitles = categoryRows.map(row => row.title);
    categoryTitles.sort();

    assert.deepEqual(categoryTitles, ["Endocrinologists", "Podiatrists"])

  });

  describe.only(".getExistingBusinessesByCategoryandLocation", () => {
    it("finds businesses for a given category near a given location", async () => {
      const businesses = await database.getExistingBusinessesByCategoryandLocation("physicians", 37.767412344, -122.428245678);
      businesses.sort((a, b) => a.name - b.name)

      const businessNames = businesses.map(entry => entry.name);
      assert.deepEqual(businessNames, ["Dr. Brain", "Dr. Seagull"])

      const businessLocations = businesses.map(entry => Math.round(entry.location.latitude));
      assert.deepEqual(businessLocations, [38, 38])

      const businessCategories = businesses.map(entry => {
        return entry.category_titles;
      });
      assert.deepEqual(businessCategories, [["Endocrinologists", "Podiatrists"], ["Surgeons", "Podiatrists"]])
    });
  });

  describe(".createReview", () => {
    it("creates a review", async () => {
      await database.createReview(2, {
        accountKitId: '23432',
        reviewContent: "I love this person deeply.",
        reviewTimestamp: 2344959595,
        fatFriendlyRating: 90,
        skillRating: 60
      });
      await database.createReview(2, {
        accountKitId: '23555',
        reviewContent: "I hate.",
        reviewTimestamp: 2344959594,
        fatFriendlyRating: 30,
        skillRating: 50
      });

      const reviews = await database.getReviewsByBusinessId(2);

      const reviewerIds = reviews.map(function(review) {
        return review.account_kit_id;
      })

      reviewerIds.sort();

      assert.deepEqual(reviewerIds, ['23432', '23555']);
    });

    it("updates the business' fat friendly rating when a new review is added", async () => {
      const newBusinessId = await database.createBusiness({
        yelpId: "dr-seagull",
        name: "Dr. Seagull",
        address1: "432 Mission St",
        state: "CA",
        city: "San Francisco",
        phoneNumber: "444-342-4532",
        latitude: 37.767423217936834,
        longitude: -122.42821739746094,
        categories: [
          {
            "alias": "surgeons",
            "title": "Surgeons"
          }
        ]
      });

      await database.createReview(newBusinessId, {
        accountKitId: '23482',
        reviewContent: "super meh.",
        reviewTimestamp: 2344959596,
        fatFriendlyRating: 10,
        skillRating: 60
      });

      await database.updateBusinessScore(newBusinessId, 10);

      const score = await database.getBusinessScoreById(newBusinessId);

      assert.equal(score, 10);

      await database.createReview(newBusinessId, {
        accountKitId: '23482',
        reviewContent: "super raddddd.",
        reviewTimestamp: 2344959597,
        fatFriendlyRating: 30,
        skillRating: 60
      });

      await database.updateBusinessScore(newBusinessId, 30);

      const newScore = await database.getBusinessScoreById(newBusinessId);


      assert.equal(newScore, 20);
    });
  })

  describe(".getAliasForCategoryTitle", () => {
    it("returns the correct alias for a category title", async () => {
      alias = await database.getAliasForCategoryTitle("Doctors");
      assert.equal(alias, "physicians");
    });
  });
});
