        const pgp = require('pg-promise')();
const databaseConfig = require('../database.json')
let db = null;

exports.connect = function(env) {
  db = pgp(databaseConfig[env]);
}

exports.clear = async function() {
  await db.query('delete from categories');
}

exports.addYelpCategories = async function(yelpCategories) {
  const idsByAlias = {};
  const descendentIdsById = {};
  const parentIdsById = {};

  for (const entry of yelpCategories) {
    const categoryId = await db.query(
      'insert into categories (parent_id, title, alias) select $1, $2, $3 where not exists (select title from categories where title = $2) returning id',
      [null, entry.title, entry.alias]
    );
    idsByAlias[entry.alias] = categoryId[0].id;
  }

  for (const entry of yelpCategories) {
    if (entry.parents[0]) {
      let parentId = idsByAlias[entry.parents[0]];
      parentIdsById[idsByAlias[entry.alias]] = parentId;
    }
  }

  for (let id in parentIdsById) {
    const descendentId = id
    while (parentIdsById[id]) {
      const parentId = parentIdsById[id];
      if (descendentIdsById[parentId]) {
        descendentIdsById[parentId].push(parseInt(descendentId));
      } else {
        descendentIdsById[parentId] = [parseInt(descendentId)];
      }
      id = parentId;
    }
  }


  for (const alias in idsByAlias) {
    const id = idsByAlias[alias];
    await db.query(
      'update categories set parent_id = $1, descendent_ids = $2 where id = $3',
      [parentIdsById[id], descendentIdsById[id], id]
    )
  }

  pgp.end();
}

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
  return business;
}

exports.getBusinessByYelpId = async function(yelpId) {
  return (await db.query('select * from businesses where yelp_id = $1', yelpId))[0];
};

exports.createBusiness = async function(business) {
  const categoryAliases = business.categories.map(category => {
    return category.alias;
  })
  const categoryIds = await db.query('select id from categories where alias = ANY ($1)', [categoryAliases]);
  try {
    await db.query('BEGIN');
    const rows = await db.query(
      'insert into businesses ' +
      '(name, yelp_id, address1, address2, state, city, phone_number, location) values ' +
      '($1, $2, $3, $4, $5, $6, $7, ST_MakePoint($8, $9)) returning id',
      [
        business.name,
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

    for (i = 0; i < categoryIds.length; i++ ) {
      await db.query(
        'insert into business_categories (worker_or_biz_id, category_id) values ($1, $2)',
        [rows[0].id, categoryIds[i].id]
      );
    }
    await db.query('COMMIT');
    return rows[0].id;
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  }
};

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

exports.getRecentReviews = async function() {
  const rows = await db.query('select users.name as username, * from reviews, users, businesses where reviews.account_kit_id = users.account_kit_id and reviews.worker_or_biz_id = businesses.id order by timestamp desc limit 5;')
  return rows.map(row => {
    return {
      content: row.content,
      id: row.id,
      workerOrBizId: row.worker_or_biz_id,
      businessName: row.name,
      fatSlider: row.fat_slider,
      skillSlider: row.skill_slider,
      timestamp: row.timestamp.getTime(),
      user: {
        accountKitId: row.account_kit_id,
        name: row.username
      }
    }
  })
}

exports.getIdsDescendingFromTitle = async function(category) {
  const mainIdAndDescendentIds = [];
  const categoryRow = await db.query('select * from categories where title = $1', category);
  mainIdAndDescendentIds.push(categoryRow[0].id);
  for (const id of categoryRow[0].descendent_ids) {
    mainIdAndDescendentIds.push(id)
  }
  return mainIdAndDescendentIds;
}

exports.getExistingBusinessesByCategoryandLocation = async function(category, latitude, longitude) {
  const categoryIds = this.getIdsDescendingFromTitle(category);
  const businesses = await db.query(
    'select * from businesses, business_categories where ST_Distance_Sphere(location, ST_MakePoint($1, $2))<=  80000 and business_categories.category_id = ANY ($3)',
    [latitude, longitude, categoryIds]
  );
  return businesses;
}

exports.getCategoryById = async function(id) {
  const category = (await db.query('select * from categories where id = $1', id))[0];
  return category;
}
