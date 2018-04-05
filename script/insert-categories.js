#!/usr/bin/env node

const fs = require('fs');
const categories = require('../src/categories.json');
const tags = fs.readFileSync(__dirname + '/../src/tags.txt', 'utf8')
  .split('\n')
  .filter(line => line.length != 0);

const database = require('../src/database');

const environment = process.argv[2];
if (environment == null) {
  console.log("Must pass an environment name");
  process.exit(1);
}

database.connect(environment);

database.tx(async tx => {
  const idsByTitle = {};

  for (const category of categories) {
    const [row] = await tx.query(`
      insert into categories
        (title) values
        ($1)
      on conflict (title) do update
        set title = $1
      returning id
    `, [category.title]);

    idsByTitle[category.title] = row.id;
  }

  for (const category of categories) {
    if (category.parent && !idsByTitle[category.parent]) {
      throw new Error(`No such category: ${category.parent}`);
    }

    await tx.query(`
      update categories
      set parent_id = $2
      where id = $1
    `, [idsByTitle[category.title], idsByTitle[category.parent]]);
  }

  for (const tag of tags) {
    await tx.query(`
      insert into tags
        (name, is_pending)
      values
        ($1)
      on conflict
      do nothing
    `, [tag, false]);
  }
}).then(() => {
  process.exit(0);
});
