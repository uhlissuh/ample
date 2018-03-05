const GOOGLE_URL = 'https://maps.googleapis.com/maps/api'
const {GOOGLE_API_KEY} = process.env

module.exports =
class GooglePlacesClient {
  constructor(request) {
    this.request = request || require('request-promise');
  }

  getPhotoURL(photoReference, maxWidth, maxHeight) {
    return `${GOOGLE_URL}/place/photo?key=${GOOGLE_API_KEY}&maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}`
  }

  async getBusinessesNearCoordinates(term, latitude, longitude) {
    const response = await this.makeRequest(
      `place/nearbysearch/json?` +
      `key=${GOOGLE_API_KEY}&` +
      `location=${latitude},${longitude}&` +
      `radius=50000&` +
      `keyword=${encodeURIComponent(term)}`
    );
    return response.results;
  }

  async getBusinessById(id) {
    const response = await this.makeRequest(
      `place/details/json?key=${GOOGLE_API_KEY}&placeid=${id}`
    );
    return response.result;
  }

  async getCoordinatesForLocationName(locationName) {
    const response = await this.makeRequest(
      `geocode/json?key=${GOOGLE_API_KEY}&address=${encodeURIComponent(locationName)}`
    );
    return response.results[0].geometry.location;
  }

  async autocompletePlaceName(input) {
    const response = await this.makeRequest(
      `place/autocomplete/json?key=${GOOGLE_API_KEY}&types=geocode&input=${encodeURIComponent(input)}`
    );
    return response.predictions.map(prediction => prediction.description)
  }

  async makeRequest(uri) {
    const fullURI = GOOGLE_URL + '/' + uri;
    const response = await this.request({uri: fullURI, json: true});
    if (response.status != 'OK') {
      throw new Error(`Google places request failed. URI: ${uri}, Status: ${response.status}`);
    }
    return response;
  }
};
