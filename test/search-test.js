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
      return {
        businesses: [
          buildYelpBusiness('dr-sunhat', 'Dr. Sunhat'),
          buildYelpBusiness('dr-brain', 'Dr. Brain'),
          buildYelpBusiness('dr-chips', 'Dr. Chips'),
          buildYelpBusiness('dr-pringles', 'Dr. Pringles')
        ]
      }
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
      yelpId: "dr-pringles",
      name: "Dr. Pringles",
      latitude: 37.767413217936834,
      longitude: -122.42820739746094,
      categories: [
        {
          "alias": "physicians",
          "title": "Doctors"
        },
        {
          "alias": "weirdos",
          "title": "Creeps"
        }
      ]
    })

    await database.createBusiness({
      yelpId: "dr-coffee",
      name: "Dr. Coffee",
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
    const businesses = await search.searchForBusinesses('Doctors', 37.767413217936834, -122.42820739746094);
    const businessesNames = businesses.map(business => {
      return business.name;
    })
    assert.deepEqual(businessesNames, ["Dr. Brain", "Dr. Pringles", "Dr. Chips", "Dr. Sunhat"]);

    const categories = businesses.map(business => {
      return business.category_titles;
    })
    assert.deepEqual(categories, [["Doctors"], ["Doctors", "Creeps"], ["Doctors"], ["Doctors"]]);
  });
})

function buildYelpBusiness (yelpId, name) {
  return {
    yelpId: yelpId,
    name: name,
    location: {
      address1: "375 Valencia St",
      address2: "Suite 3",
      state: "CA",
      city: "San Francisco"
    },
    phone: "444-342-4532",
    coordinates: {
      latitude: 37.767413217936834,
      longitude: -122.42821739746094
    },
    categories: [
      {
        "alias": "physicians",
        "title": "Doctors"
      }
    ]
  }
}
