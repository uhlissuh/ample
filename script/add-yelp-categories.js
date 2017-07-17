#!/usr/bin/env node

const pgp = require('pg-promise')();
const databaseConfig = require('../database.json')
const db = pgp(databaseConfig.dev);
const yelpCategories = require('../categories.json');

async function main() {
  for(const entry of yelpCategories) {
    await db.query(
      'insert into categories (parent_id, title, alias) select $1, $2, $3 where not exists (select title from categories where title = $2)',
      [null, entry.title, entry.alias]
    )
  }
  for(const entry of yelpCategories) {
    if (entry.parents[0]) {
      let parentId = (await db.query(
        'select id from categories where alias = $1 limit 1',
        entry.parents[0]
      ))[0].id
      await db.query(
        'update categories set parent_id = $1 where title = $2',
        [parentId, entry.title]
      )
    }
  }
  console.log('done');
  pgp.end();
}

main()
