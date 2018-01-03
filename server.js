const apiServer = require('./api-server');
const express = require('express');
const database = require("./src/database");
const bodyParser = require('body-parser');
const expressLayout = require('express-ejs-layouts');
const search = require("./src/search")

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
  const category = req.query.category;
  const location = req.query.location;
  const latitude = 45.5231;
  const longitude = -122.6765;

  const searchResults = await search.searchForBusinesses(category, latitude, longitude);


  res.render('search_results',
    {
      category: category,
      location: location,
      businesses: searchResults
    }
  );

});

app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
