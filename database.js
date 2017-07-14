const pgp = require('pg-promise')();
const databaseConfig = require('./database.json')
const db = pgp(databaseConfig.dev);

exports.getServicersByCategory = async function(categoryId) {
  const data = await db.query('select * from servicers where category_id =' + categoryId)
  console.log('got the data', data);
  return data;
}

exports.getServicerReviewsById = async function(servicer_id) {
  const data = await db.query('select * from reviews where servicer_id =' + servicer_id)
  return data;
}
exports.getAllCategories = async function(){
  const data = await db.query('select * from categories');
  return data;
}

exports.getSubcategoriesForCategory = async function(categoryName){
  const categoryRow = await db.query('select id from categories where name = $1', categoryName);
  const subcategories = await db.query('select name from subcategories where category_id = $1', categoryRow[0].id)
  return subcategories;
}
