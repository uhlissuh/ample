const pgp = require("pg-promise")();
const databaseConfig = require("../database.json");
let db = null;

exports.connect = function(env) {
  db = pgp(databaseConfig[env]);
};

exports.clear = async function() {
  await db.query("delete from reviews");
  await db.query("delete from businesses");
  await db.query("delete from users");
};

exports.getBusinessbyName = async function(businessName) {
  const business = await db.query(
    "select * from businesses where name = $1",
    businessName
  );
  return business;
};

exports.getBusinessByGoogleId = async function(googleId) {
  const [row] = await db.query(
    `
      select *, ST_x(coordinates) as latitude, ST_y(coordinates) as longitude
      from businesses
      where google_id = $1 limit 1
    `,
    googleId
  );
  if (row) return businessFromRow(row);
};

exports.getBusinessesByGoogleIds = async function(googleIds) {
  const rows = await db.query(
    `
      select *, ST_x(coordinates) as latitude, ST_y(coordinates) as longitude
      from businesses
      where google_id = ANY($1)
    `,
    [googleIds]
  );
  return rows.map(businessFromRow);
}

exports.getBusinessById = async function(id) {
  const [row] = await db.query(
    `
      select *, ST_x(coordinates) as latitude, ST_y(coordinates) as longitude
      from businesses
      where id = $1 limit 1
    `,
    id
  );
  if (row) return businessFromRow(row);
};

function businessFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    googleId: row.google_id,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    reviewCount: row.review_count,
    rating: row.review_count > 0
      ? row.total_rating / row.review_count
      : null
  };
}

exports.transact = async function(callback) {
  try {
    await db.query("BEGIN");
    const result = await callback();
    await db.query("COMMIT");
    return result;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
};

exports.createBusiness = async function(business) {
  const rows = await db.query(
    "insert into businesses " +
      "(name, google_id, address, phone, coordinates) values " +
      "($1, $2, $3, $4, ST_MakePoint($5, $6)) returning id",
    [
      business.name,
      business.googleId,
      business.address,
      business.phone,
      parseFloat(business.latitude),
      parseFloat(business.longitude)
    ]
  );
  return rows[0].id;
};

exports.createReview = async function(userId, businessId, review) {
  return this.transact(async () => {
    const [businessRow] = await db.query(
      'select total_rating, review_count from businesses where id = $1 limit 1',
      businessId
    );

    await db.query(
      `
        update businesses
        set total_rating = $2, review_count = $3
        where id = $1
      `,
      [
        businessId,
        businessRow.total_rating + review.rating,
        businessRow.review_count + 1
      ]
    );

    const rows = await db.query(
      "insert into reviews " +
        "(business_id, user_id, content, timestamp, rating) values " +
        "($1, $2, $3, $4, $5) returning id",
      [
        businessId,
        userId,
        review.content,
        new Date(),
        review.rating,
      ]
    );
    return rows[0].id;
  })
};

exports.updateBusinessScore = async function(businessId, score) {
  const oldScore = (await db.query(
    "select score from businesses where id = $1",
    businessId
  ))[0].score;
  if (oldScore) {
    const newAverage = (oldScore + score) / 2;
    await db.query("update businesses set score = $1 where id = $2", [
      newAverage,
      businessId
    ]);
  } else {
    await db.query("update businesses set score = $1 where id = $2", [
      score,
      businessId
    ]);
  }
};

exports.getBusinessReviewsById = async function(id) {
  const rows = await db.query(
    "select * from reviews, users where business_id = $1 and reviews.user_id = users.id",
    [id]
  );
  return rows.map(row => {
    return {
      id: row.id,
      content: row.content,
      rating: row.rating,
      timestamp: row.timestamp.getTime(),
      user: {
        id: row.user_id,
        name: row.name,
        accountKitId: row.account_kit_id
      }
    };
  });
};

exports.getRecentReviews = async function() {
  const rows = await db.query(
    "select users.name as username, * from reviews, users, businesses where reviews.account_kit_id = users.account_kit_id and reviews.worker_or_biz_id = businesses.id order by timestamp desc limit 5;"
  );
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
    };
  });
};

exports.getIdsDescendingFromAlias = async function(category) {
  const mainIdAndDescendentIds = [];
  const categoryRow = await db.query(
    "select * from categories where alias = $1",
    category
  );
  if (categoryRow) {
    mainIdAndDescendentIds.push(categoryRow[0].id);
    if (categoryRow[0].descendent_ids) {
      for (const id of categoryRow[0].descendent_ids) {
        mainIdAndDescendentIds.push(id);
      }
    }
    return mainIdAndDescendentIds;
    console.log(
      "this is the main id and descencent ids ",
      mainIdAndDescendentIds
    );
  } else {
    console.log(category + " is not a category!");
    return [];
  }
};

exports.getExistingBusinessesByCategoryandLocation = async function(
  category,
  latitude,
  longitude
) {
  const categoryIds = await this.getIdsDescendingFromAlias(category);
  const businessRows = await db.query(
    `
      select distinct
        businesses.*,
        ST_x(businesses.location) as latitude,
        ST_y(businesses.location) as longitude
      from businesses inner join business_categories
      on businesses.id = business_categories.worker_or_biz_id
      where
        ST_DistanceSphere(businesses.location, ST_MakePoint($1, $2)) <=  30000
        and business_categories.category_id = ANY ($3)
    `,
    [latitude, longitude, categoryIds]
  );

  if (businessRows.length == 0) return [];

  const categoryRows = await db.query(
    `
      select worker_or_biz_id, title
      from business_categories inner join categories
      on categories.id = business_categories.category_id
      where business_categories.worker_or_biz_id = ANY ($1)
    `,
    [businessRows.map(row => row.id)]
  );

  const categoryTitlesByBusinessId = {};
  for (const {worker_or_biz_id, title} of categoryRows) {
    if (!categoryTitlesByBusinessId[worker_or_biz_id]) {
      categoryTitlesByBusinessId[worker_or_biz_id] = [title]
    } else {
      categoryTitlesByBusinessId[worker_or_biz_id].push(title)
    }
  }

  return businessRows.map(row => {
    return {
      id: row.id,
      name: row.name,
      coordinates: {
        latitude: row.latitude,
        longitude: row.longitude
      },
      phone: row.phone_number,
      city: row.city,
      state: row.state,
      address1: row.address1,
      address2: row.address2,
      googleId: row.google_id,
      score: row.score,
      categoryTitles: categoryTitlesByBusinessId[row.id]
    }
  })
};

exports.getCategoryById = async function(id) {
  const category = (await db.query(
    "select * from categories where id = $1",
    id
  ))[0];
  return category;
};

exports.getCategoriesById = async function(ids) {
  const category = await db.query(
    "select * from categories where id = ANY ($1)",
    [ids]
  );
  return category;
};

exports.getCategoriesforBusinessId = async function(businessId) {
  const categories = await db.query(
    "select * from business_categories where worker_or_biz_id = $1",
    businessId
  );
  const categoryIds = categories.map(function(entry) {
    return entry.category_id;
  });
  return categoryIds;
};

exports.getBusinessScoreById = async function(id) {
  const score = (await db.query(
    "select score from businesses where id = $1",
    id
  ))[0].score;
  return score;
};

exports.getAliasForCategoryTitle = async function(title) {
  const alias = (await db.query(
    "select alias from categories where title = $1",
    title
  ))[0].alias;
  return alias;
};

exports.createUser = async function (user) {
  const rows = await db.query(
    `insert into users
     (name, account_kit_id, email, phone) values
     ($1, $2, $3, $4) returning id`,
    [
      user.name,
      user.accountKitId,
      user.email,
      user.phone,
    ]
  );
  return rows[0].id;
};

exports.getUserByAccountKitId = async function (accountKitId) {
  const [row] = await db.query(
    'select * from users where account_kit_id = $1',
    [accountKitId]
  );

  if (row) {
    return {
      name: row.name,
      accountKitId: row.account_kit_id,
      email: row.email,
      phone: row.phone
    }
  }
};
