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

exports.getBusinessByYelpId = async function(yelpId) {
  return (await db.query('select * from businesses where yelp_id = $1', yelpId))[0];
}

exports.createBusiness = async function(business) {
  const rows = await db.query(
    'insert into businesses ' +
    '(name, yelp_id, address1, address2, state, city, phone_number, location) values ' +
    '($1, $2, $3, $4, $5, $6, $7, ST_MakePoint($8, $9)) returning id',
    [
      business.businessName,
      business.yelpId,
      business.address1,
      business.address2,
      business.state,
      business.city,
      business.phoneNumber,
      parseFloat(business.latitude),
      parseFloat(business.longitude)
    ]
  );
  return rows[0].id;
}

exports.createReview = async function(businessId, review) {
  const rows = await db.query(
    'insert into reviews ' +
    '(worker_or_biz_id, account_kit_id, content, timestamp, fat_slider, skill_slider) values ' +
    '($1, $2, $3, $4, $5, $6) returning id',
    [
      businessId,
      review.accountKitId,
      review.reviewContent,
      new Date(review.reviewTimestamp * 1000),
      review.fatFriendlyRating,
      review.skillRating
    ]
  )
  return rows[0].id
}

exports.getBusinessReviewsByYelpId = async function(yelpId) {
  const business = await this.getBusinessByYelpId(yelpId);
  if (business) {
    const rows = await db.query('select * from reviews, users where worker_or_biz_id = $1 and reviews.account_kit_id = users.account_kit_id', business.id);
    return rows.map(row => {
      return {
        content: row.content,
        id: row.id,
        workerOrBizId: row.worker_or_biz_id,
        fatSlider: row.fat_slider,
        skillSlider: row.skill_slider,
        timestamp: row.timestamp.getTime(),
        user: {
          accountKitId: row.account_kit_id,
          name: row.name
        }
      }
    })
  }
  return []
}
