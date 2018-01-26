require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');

const database = require("./src/database");
const apiServer = require('./api-server');
const BusinessSearch = require("./src/business-search");
const GooglePlacesClient = require('./src/google-places');

const port = 8000;

process.on('unhandledRejection', (error) => {
  console.error(error)
})

database.connect("dev");

const app = express();

app.set('view engine', 'ejs')
app.set('views', 'src/views')

app.use(expressLayout);
app.use('/static', express.static('static'));
app.use('/api', apiServer);
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.render('index', {currentTime: Date.now()})
});

app.get('/searchforbusinesses', async function(req, res) {
  const term = req.query.term;
  const location = req.query.location;
  const googlePlacesClient = new GooglePlacesClient();
  const businessSearch = new BusinessSearch(googlePlacesClient);
  const searchResults = await businessSearch.findBusinesses(term, location);

    console.log(searchResults);

  res.render('search_results',
    {
      term: term,
      location: location,
      businesses: searchResults
    }
  );

});

app.get('/:googleId', async function(req, res) {
  const googleId = req.params.googleId;
  console.log("google id ", googleId);
  const googlePlacesClient = new GooglePlacesClient();
  const business = await googlePlacesClient.getBusinessById(googleId);

  console.log("business result is ", business);

  res.render('business',
    {
      name: business.name,
      formatted_address: business.formatted_address,
      formatted_phone_number: business.formatted_phone_number,
      location: business.geometry.location,
      photos: business.photos
    }
  );

})

app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
