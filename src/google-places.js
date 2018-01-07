const request = require('request-promise');
const GOOGLE_URL = 'https://maps.googleapis.com/maps/api'
const {GOOGLE_API_KEY} = process.env

exports.getBusinessesNearCoordinates = async function (term, latitude, longitude) {
  const response = await request({
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

exports.getBusinessById = async function(id) {
  const response = await request({
    uri: `${GOOGLE_URL}/place/details/json?key=${GOOGLE_API_KEY}&placeid=${id}`,
    json: true
  });

  if (response.status != 'OK') {
    throw new Error(`Google place details failed. Status: ${response.status}, ${JSON.stringify(response)}`);
  }

  return response.result;
}

exports.getCoordinatesForLocationName = async function(locationName) {
  const response = await request({
    uri: `${GOOGLE_URL}/geocode/json?key=${GOOGLE_API_KEY}&address=${encodeURIComponent(locationName)}`,
    json: true
  });

  if (response.status != 'OK') {
    throw new Error(`Google geocoding failed. Status: ${response.status}`);
  }

  return response.results[0].geometry.location;
}
