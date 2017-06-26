const pgp = require('pg-promise')();

const db = pgp('postgres://app@localhost:5432/ample');


exports.getServicersByCategory = async function(categoryId) {
  const data = await db.query('select * from servicers where category_id =' + categoryId)
  console.log('got the data', data);
  return data;
}
