const apiServer = require('./api-server');
const express = require('express');
const database = require("./src/database");
const expressLayout = require('express-ejs-layouts');

const port = 8000;

process.on('unhandledRejection', (error) => {
  console.error(error)
})

database.connect("dev");

const app = express();

app.set('view engine', 'ejs')
app.set('views', 'src/views')

app.use(expressLayout);
app.use('/api', apiServer);

app.get('/', (req, res) => {
  res.render('index', {currentTime: Date.now()})
})

app.listen(port, function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s.', port);
});
