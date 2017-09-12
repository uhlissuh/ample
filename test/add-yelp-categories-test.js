const assert = require('assert');
const categoriesJSON = require('../categories.json');
const database = require('../src/database');

database.connect("test");

describe("add yelp categories", () => {
  beforeEach(async () => {
    await database.clearCategories()
  });

  it("inserts a row for each category", async () => {
    await database.addYelpCategories([
      {
        "alias": "abruzzese",
        "title": "Abruzzese",
        "parents": [
          "italian"
        ]
      },
      {
        "alias": "westcoastabruzzese",
        "title": "West Coast Abruzzese",
        "parents": [
          "abruzzese"
        ]
      },
      {
        "alias": "absinthebars",
        "title": "Absinthe Bars",
        "parents": []
      },
      {
        "alias": "acaibowls",
        "title": "Acai Bowls",
        "parents": [
          "food"
        ]
      },
      {
        "alias": "italian",
        "title": "Italian",
        "parents": [
          "restaurants"
        ]
      },
      {
        "alias": "israeli",
        "title": "Israeli",
        "parents": [
          "restaurants"
        ]
      },
      {
        "alias": "restaurants",
        "title": "Restaurants",
        "parents": []
      },
      {
        "alias": "food",
        "title": "Food",
        "parents": []
      }
    ]);
    const ids = await database.getIdsDescendingFromAlias("restaurants");
    let aliases = []
    for (const id of ids) {
      const alias = (await database.getCategoryById(id)).alias
      aliases.push(alias);
    }
    aliases.sort();
    assert.deepEqual(aliases, ["abruzzese", "israeli", "italian", "restaurants", "westcoastabruzzese"])
  }).timeout(5000)

})
