const pgp = require('pg-promise')();
const databaseConfig = require('./database.json')
const db = pgp(databaseConfig.dev);


exports.getAllCategoryTitles = async function(){
  const data = await db.query('select title from categories');
  categoryNames = data.map(function(category) {
    return category.title
  })
  return categoryNames;
}

exports.getSubcategoriesForCategory = async function(categoryName){
  const categoryRow = await db.query('select id from categories where name = $1', categoryName);
  const subcategories = await db.query('select name from subcategories where category_id = $1', categoryRow[0].id)
  return subcategories;
}

exports.getBusinessbyName = async function(businessName) {
  const business = await db.query('select * from businesses where name = $1', businessName);
  console.log("INSIDE GET BUS BY NAME", business);
  return business;
}

exports.createBusiness = async function(business) {
  console.log("INSIDE createBusiness");
  const businessId = await db.query('insert into businesses (name, location) values ($1, ST_MakePoint($2, $3)) RETURNING id',
    [business.businessName, parseFloat(business.latitude), parseFloat(business.longitude)]
  );
  return businessId[0].id;
}

exports.insertReview = async function(business, businessId) {
  const date = new Date(business.reviewTimestamp * 1000)
  console.log(date)
  const reviewId = await db.query('insert into reviews (account_kit_id, worker_or_biz_id, content, timestamp, fat_slider, skill_slider) values ($1, $2, $3, $4, $5, $6) returning id',
    [business.accountKitId, businessId, business.reviewContent, date, business.fatFriendlyRating, business.skillRating])
  return reviewId[0].id
}
