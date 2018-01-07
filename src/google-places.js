const GOOGLE_URL = 'https://maps.googleapis.com/maps/api'
const {GOOGLE_API_KEY} = process.env

module.exports =
class GooglePlacesClient {
  constructor(request) {
    this.request = request || require('request-promise');
  }

  async getBusinessesNearCoordinates(term, latitude, longitude) {
    const response = await this.request({
      uri: `${GOOGLE_URL}/place/nearbysearch/json?` +
           `key=${GOOGLE_API_KEY}&` +
           `location=${latitude},${longitude}&` +
           `radius=50000&` +
           `keyword=${encodeURIComponent(term)}`,
      json: true
    });

    if (response.status != 'OK') {
      throw new Error(`Google place search failed. Status: ${response.status}, ${JSON.stringify(response)}`);
    }

    return response.results;
  }

  async getBusinessById(id) {
    const response = await this.request({
      uri: `${GOOGLE_URL}/place/details/json?key=${GOOGLE_API_KEY}&placeid=${id}`,
      json: true
    });

    if (response.status != 'OK') {
      throw new Error(`Google place details failed. Status: ${response.status}, ${JSON.stringify(response)}`);
    }

    return response.result;
  }

  async getCoordinatesForLocationName(locationName) {
    const response = await this.request({
      uri: `${GOOGLE_URL}/geocode/json?key=${GOOGLE_API_KEY}&address=${encodeURIComponent(locationName)}`,
      json: true
    });

    if (response.status != 'OK') {
      throw new Error(`Google geocoding failed. Status: ${response.status}`);
    }

    return response.results[0].geometry.location;
  }

  async autocompletePlaceName(input) {
    const response = await this.request({
      uri: `${GOOGLE_URL}/place/autocomplete/json?key=${GOOGLE_API_KEY}&types=geocode&input=${encodeURIComponent(input)}`,
      json: true
    });

    return response.predictions.map(prediction => prediction.description)
  }
};
