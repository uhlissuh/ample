#!/usr/bin/env node

const pgp = require('pg-promise')();
const databaseConfig = require('../database.json')
const db = pgp(databaseConfig.dev);
const yelpCategories = require('./categories.json');

async function main() {
  for(const entry in yelpCategories) {
    await db.query('insert into categories (parent_id, title, alias)')
  }
}
