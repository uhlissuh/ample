const GOOGLE_URL = 'https://maps.googleapis.com/maps/api'

module.exports =
class GooglePlacesClient {
  constructor(apiKey, request) {
    this.apiKey = apiKey;
    this.request = request || require('request-promise');
  }

  getPhotoURL(photoReference, maxWidth, maxHeight) {
    return `${GOOGLE_URL}/place/photo?key=${this.apiKey}&maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}`
  }

  async getBusinessesNearCoordinates(term, latitude, longitude) {
    const response = await this.makeRequest(
      `place/nearbysearch/json?` +
      `key=${this.apiKey}&` +
      `location=${latitude},${longitude}&` +
      `rankby=distance&` +
      `keyword=${encodeURIComponent(term)}`

    );
    return response.results;
  }

  async getBusinessById(id) {
    const response = await this.makeRequest(
      `place/details/json?key=${this.apiKey}&placeid=${id}`
    );
    return response.result;
  }

  async getCoordinatesForLocationName(locationName) {
    const response = await this.makeRequest(
      `geocode/json?key=${this.apiKey}&address=${encodeURIComponent(locationName)}`
    );
    return response.results[0].geometry.location;
  }

  async autocompletePlaceName(input) {
    const response = await this.makeRequest(
      `place/autocomplete/json?key=${this.apiKey}&types=geocode&input=${encodeURIComponent(input)}`
    );
    return response.predictions.map(prediction => prediction.description)
  }

  async makeRequest(uri) {
    const fullURI = GOOGLE_URL + '/' + uri;
    const response = await this.request({uri: fullURI, json: true});
    if (response.status == 'ZERO_RESULTS') {
      return {results: []};
    } else if (response.status != 'OK') {
      throw new Error(`Google places request failed. URI: ${uri}, Status: ${response.status}`);
    }
    return response;
  }
};
