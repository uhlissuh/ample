const database = require('../src/database');
const databaseConfig = require("../database.json");
database.connect(databaseConfig.test);
