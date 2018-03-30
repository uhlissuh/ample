const GooglePlacesClient = require('../src/google-places');
const assert = require('assert');

describe("google places", () => {
  describe(".autocompletePlaceName", () => {
    it("autocompletes the place name using the google places API", async () => {
      const client = new GooglePlacesClient('', async () => {
        return require('./fixtures/google-places-autocomplete-response.json');
      });

      const results = await client.autocompletePlaceName('Alberta');
      assert.deepEqual(results, [
        'Alberta, Portland, OR, United States',
        'North Alberta Street, Portland, OR, United States',
        'Northeast Alberta Street, Portland, OR, United States',
        'Alberta Park Trail, Portland, OR, United States',
        'Alberta, Canada'
      ]);
    });
  });
});
