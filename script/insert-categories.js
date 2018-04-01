#!/usr/bin/env node

const categories = require('../src/categories.json');
const database = require('../src/database');

const environment = process.argv[2];
if (environment == null) {
  console.log("Must pass an environment name");
  process.exit(1);
}

database.connect(environment);

database.transact(async () => {
  const idsByTitle = {};

  for (const category of categories) {
    const [row] = await database.query(`
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

    await database.query(`
      update categories
      set parent_id = $2
      where id = $1
    `, [idsByTitle[category.title], idsByTitle[category.parent]]);
  }
}).then(() => {
  process.exit(0);
});
