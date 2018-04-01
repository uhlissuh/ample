const database = require('../src/database');

before(async () => {
  await database.connect('test');
});
