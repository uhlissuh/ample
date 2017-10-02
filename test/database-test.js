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
    })
  })

  afterEach(async () => {
    await database.clearCategories();
    await database.clearBusinessesAndBusinessCategories();
  })

  it("creates three businesses", async () => {

    const entry = await database.getBusinessByYelpId("dr-brain");
    const drBrainName = entry.name;

    assert.equal(drBrainName, "Dr. Brain");
  });

  it("finds businesses for a given category near a given location", async () => {
    const businesses = await database.getExistingBusinessesByCategoryandLocation("physicians", 37.767412344, -122.428245678);
    const businessNames = businesses.map(function(entry) {
      return entry.name;
    })
    businessNames.sort()
    assert.deepEqual(businessNames, ["Dr. Brain", "Dr. Seagull"])
  });
});
