const database = require('../src/database');
const yelp = require('../src/yelp')
const assert = require('assert');
const search = require('../src/search');

database.connect("test");

describe("searchForBusinesses", () => {
  let originalYelpGetBusinessesFunction

  beforeEach(async () => {
    originalYelpGetBusinessesFunction = yelp.getBusinessesByCategoryAndLocation

    yelp.getBusinessesByCategoryAndLocation = async function() {
      return [
        {
          yelpId: "dr-sunhat",
          name: "Dr. Sunhat",
          address1: "375 Valencia St",
          address2: "Suite 3",
          state: "CA",
          city: "San Francisco",
          phoneNumber: "444-342-4532",
          latitude: 37.767413217936834,
          longitude: -122.42821739746094,
          categories: [
            {
              "alias": "physicians",
              "title": "Doctors"
            }
          ]
        },
        {
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
              "alias": "physicians",
              "title": "Doctors"
            }
          ]
        },
        {
          yelpId: "dr-Chips",
          name: "Dr. Chips",
          address1: "375 Valencia St",
          address2: "Suite 3",
          state: "CA",
          city: "San Francisco",
          phoneNumber: "444-342-4532",
          latitude: 37.767413217936834,
          longitude: -122.42822739746094,
          categories: [
            {
              "alias": "physicians",
              "title": "Doctors"
            }
          ]
        }
      ]
    }

    await database.addYelpCategories([
      {
        "alias": "physicians",
        "title": "Doctors",
        "parents": []
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
          "alias": "physicians",
          "title": "Doctors"
        }
      ]
    })

    await database.createBusiness({
      yelpId: "dr-coffee",
      name: "Dr. Coffee",
      address1: "375 Valencia St",
      address2: "Suite 3",
      state: "XX",
      city: "Ocean",
      phoneNumber: "444-342-4532",
      latitude: 37.767413217936834,
      longitude: -152.42820739746094,
      categories: [
        {
          "alias": "physicians",
          "title": "Doctors"
        }
      ]
    })
  })

  afterEach(async () => {
    yelp.getBusinessesByCategoryAndLocation = originalYelpGetBusinessesFunction;
    await database.clearCategories();
    await database.clearBusinessesAndBusinessCategories();
  })

  it("merges the existing and yelp businesses with no repeats", async () => {

    const businesses = await search.searchForBusinesses('physicians', 37.767413217936834, -122.42820739746094);
    const businessesNames = businesses.map(business => {
      return business.name;
    })
    assert.deepEqual(businessesNames, ["Dr. Brain", "Dr. Chips", "Dr. Sunhat"]);
  });
})
