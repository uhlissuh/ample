const pgp = require('pg-promise')();
const databaseConfig = require('../database.json')
let db = null;

exports.connect = function(env) {
  db = pgp(databaseConfig[env]);
}

exports.clearCategories = async function() {
  await db.query('delete from categories');
}

exports.clearBusinessesAndBusinessCategories = async function() {
  await db.query('delete from businesses');
  await db.query('delete from business_categories');
}

exports.clearReviews = async function() {
  await db.query('delete from reviews');

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
    if (descendentIdsById[id]) {
      await db.query(
        'update categories set parent_id = $1, descendent_ids = $2 where id = $3',
        [parentIdsById[id], descendentIdsById[id], id]
      );
    } else {
      await db.query(
        'update categories set parent_id = $1, descendent_ids = \'{}\' where id = $2',
        [parentIdsById[id], id]
      );
    }
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

exports.getBusinessbyName = async function(businessName) {
  const business = await db.query('select * from businesses where name = $1', businessName);
  return business;
}

exports.getBusinessByYelpId = async function(yelpId) {
  return (await db.query('select * from businesses where yelp_id = $1', yelpId))[0];
};

exports.transact = async function(callback) {
  try {
    await db.query('BEGIN');
    const result = await callback();
    await db.query('COMMIT');
    return result;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}


exports.createBusiness = async function(business) {
  const categoryAliases = business.categories.map(category => {
    return category.alias;
  })
  const categoryIds = await db.query('select id from categories where alias = ANY ($1)', [categoryAliases]);
  return this.transact(async () => {
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
        parseFloat(business.longitude),
      ]
    );

    for (i = 0; i < categoryIds.length; i++ ) {
      await db.query(
        'insert into business_categories (worker_or_biz_id, category_id) values ($1, $2)',
        [rows[0].id, categoryIds[i].id]
      );
    }
    return rows[0].id;
  });
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

exports.updateBusinessScore = async function(businessId, score) {
  const oldScore = (await db.query('select score from businesses where id = $1', businessId))[0].score;
  if (oldScore) {
    const newAverage = (oldScore + score) / 2
    await db.query('update businesses set score = $1 where id = $2', [newAverage, businessId]);
  } else {
    await db.query('update businesses set score = $1 where id = $2', [score, businessId]);
  }
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

exports.getReviewsByBusinessId = async function(id) {
  return await db.query('select * from reviews where worker_or_biz_id = $1', id);
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

exports.getIdsDescendingFromAlias = async function(category) {
  const mainIdAndDescendentIds = [];
  const categoryRow = await db.query('select * from categories where alias = $1', category);
  if (categoryRow) {
    mainIdAndDescendentIds.push(categoryRow[0].id);
    for (const id of categoryRow[0].descendent_ids) {
      mainIdAndDescendentIds.push(id)
    }
    return mainIdAndDescendentIds;
    console.log("this is the main id and descencent ids ", mainIdAndDescendentIds);
  } else {
    console.log(category + " is not a category!");
    return [];
  }
}

exports.getExistingBusinessesByCategoryandLocation = async function(category, latitude, longitude) {
  const categoryIds =  await this.getIdsDescendingFromAlias(category);
  const businessRows = await db.query(
    `
      select *, ST_x(businesses.location) as latitude, ST_y(businesses.location) as longitude
      from businesses inner join business_categories
      on businesses.id = business_categories.worker_or_biz_id
      where
        ST_DistanceSphere(businesses.location, ST_MakePoint($1, $2))<=  30000
        and business_categories.category_id = ANY ($3)
    `,
    [latitude, longitude, categoryIds]
  );
  const categoryIdsForBusinesses = businessRows.map((business) => {
    return business.category_id;
  });

  const categoryRows = await db.query('select id, title from categories where id = ANY ($1)', [categoryIdsForBusinesses]);
  const categoryTitlesById = {};
  for (const category in categoryRows) {
    categoryTitlesById[category.id] = category.title
  }

  const businessesById = {};
  const businesses = [];
  for (const business of businessRows) {
    if (businessesById[business.id]) {
      businessesById[business.id].categories.push(categoryTitlesById[business.category_id]);
    } else {
      businessesById[business.id] = {
        id: business.id,
        name: business.name,
        location: {
          longitude: business.longitude,
          latitude: business.latitude
        },
        phone_number: business.phone_number,
        city: business.city,
        state: business.state,
        address1: business.address1,
        address2: business.address2,
        yelp_id: business.yelp_id,
        score: business.score,
        categories: [categoryTitlesById[business.category_id]]
      }
      businesses.push(businessesById[business.id]);
    }
  }
  return businesses;
}

exports.getCategoryById = async function(id) {
  const category = (await db.query('select * from categories where id = $1', id))[0];
  return category;
}

exports.getCategoriesforBusinessId = async function(businessId) {
  const categories = await db.query('select * from business_categories where worker_or_biz_id = $1', businessId)
  const categoryIds = categories.map(function(entry) {
    return entry.category_id;
  })
  return categoryIds;
}

exports.getReviewsbyBusinessId = async function(id) {
  const reviews = await db.query('select * from reviews where worker_or_biz_id = $1', id);
  return reviews;
}

exports.getBusinessScoreById = async function(id) {
  const score = (await db.query('select score from businesses where id = $1', id))[0].score;
  return score;
}

exports.getAliasForCategoryTitle = async function(title) {
  const alias = (await db.query('select alias from categories where title = $1', title))[0].alias;
  return alias;
}
