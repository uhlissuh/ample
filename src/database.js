const pgp = require("pg-promise")();
const databaseConfig = require("../database.json");
let db = null;

const CRITERIA_NAMES = [
  'fat',
  'trans',
  'disabled',
];

let CATEGORY_IDS_BY_TITLE, CATEGORY_TITLES_BY_ID, CHILD_CATEGORIES_BY_PARENT_CATEGORY;

exports.connect = async function(environment) {
  let config = databaseConfig[environment];
  if (config.ENV) config = process.env[config.ENV];
  db = pgp(config);

  CATEGORY_IDS_BY_TITLE = {};
  CATEGORY_TITLES_BY_ID = {};
  CHILD_CATEGORIES_BY_PARENT_CATEGORY = {};
  const rows = await db.query('select * from categories');
  for (const row of rows) {
    CATEGORY_IDS_BY_TITLE[row.title] = row.id;
    CATEGORY_TITLES_BY_ID[row.id] = row.title;
    if (row.parent_id == null) {
      CHILD_CATEGORIES_BY_PARENT_CATEGORY[row.title] = [];
    }
  }

  for (const row of rows) {
    if (row.parent_id) {
      const parentTitle = CATEGORY_TITLES_BY_ID[row.parent_id];
      CHILD_CATEGORIES_BY_PARENT_CATEGORY[parentTitle].push(row.title);
    }
  }

  Object.freeze(CHILD_CATEGORIES_BY_PARENT_CATEGORY);
  Object.freeze(CATEGORY_IDS_BY_TITLE);
  Object.freeze(CATEGORY_TITLES_BY_ID);
};

exports.clear = async function() {
  await db.query("delete from reviews");
  await db.query("delete from businesses");
  await db.query("delete from users");
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
  const business = {
    id: row.id,
    name: row.name,
    address: row.address,
    googleId: row.google_id,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    reviewCount: row.review_count,
    categories: row.category_ids.map(getCategoryTitle)
  };

  let combinedRatingCount = 0;
  let combinedTotalRating = 0;

  for (const criteriaName of CRITERIA_NAMES) {
    const ratingCount = row[criteriaName + '_rating_count'];
    const totalRating = row[criteriaName + '_rating_total'];
    combinedRatingCount += ratingCount;
    combinedTotalRating += totalRating;

    business[`${criteriaName}RatingCount`] = ratingCount;
    business[`${criteriaName}AverageRating`] = ratingCount > 0
      ? roundRating(totalRating / ratingCount)
      : null;
  }

  business.overallRating = combinedRatingCount > 0
    ? roundRating(combinedTotalRating / combinedRatingCount)
    : null;

  return business;
}

async function getFullBusinessById(tx, id) {
  return (await tx.query('select * from businesses where id = $1', [id]))[0];
}

function roundRating(rating) {
  return Math.round(rating * 10) / 10;
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

async function updateBusinessAfterReview(tx, businessId, businessRow) {
  await tx.query(
    `
      update businesses
      set
        fat_rating_total = $2,
        fat_rating_count = $3,
        trans_rating_total = $4,
        trans_rating_count = $5,
        disabled_rating_total = $6,
        disabled_rating_count = $7,
        review_count = $8,
        category_ids = $9
      where id = $1
    `,
    [
      businessId,
      businessRow.fat_rating_total,
      businessRow.fat_rating_count,
      businessRow.trans_rating_total,
      businessRow.trans_rating_count,
      businessRow.disabled_rating_total,
      businessRow.disabled_rating_count,
      businessRow.review_count,
      businessRow.category_ids
    ]
  )
}

function getCategoryId(title) {
  const result = CATEGORY_IDS_BY_TITLE[title];
  if (!result) throw new Error(`Invalid category '${title}'`);
  return result;
}

function getCategoryTitle(id) {
  return CATEGORY_TITLES_BY_ID[id];
}

exports.getChildCategoriesByParentCategory = async function() {
  return CHILD_CATEGORIES_BY_PARENT_CATEGORY;
};

exports.getAllCategories = async function() {
  return Object.keys(CATEGORY_IDS_BY_TITLE);
};

exports.createReview = async function(userId, businessId, review) {
  return this.tx(async tx => {
    const businessRow = await getFullBusinessById(tx, businessId);

    businessRow.review_count++;
    for (const criteriaName of CRITERIA_NAMES) {
      if (Number.isFinite(review[criteriaName + 'Rating'])) {
        businessRow[criteriaName + '_rating_count']++;
        businessRow[criteriaName + '_rating_total'] += review[criteriaName + 'Rating'];
      }
    }

    const categoryIds = review.categories.map(getCategoryId);
    for (const categoryId of categoryIds) {
      if (!businessRow.category_ids.includes(categoryId)) {
        businessRow.category_ids.push(categoryId);
      }
    }
    businessRow.category_ids.sort((a, b) => a - b);

    await updateBusinessAfterReview(tx, businessId, businessRow);

    const rows = await tx.query(
      `insert into reviews
        (
          business_id, user_id, content, timestamp, category_ids,
          fat_rating, trans_rating, disabled_rating
        )
        values
        (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        returning id`,
      [
        businessId,
        userId,
        review.content,
        new Date(),
        categoryIds,
        review.fatRating || null,
        review.transRating || null,
        review.disabledRating || null,
      ]
    );
    return rows[0].id;
  })
};

exports.updateReview = async function(reviewId, newReview) {
  await this.tx(async tx => {
    const oldReview = await this.getReviewById(reviewId);

    const business = await getFullBusinessById(tx, oldReview.businessId);
    for (const criteriaName of CRITERIA_NAMES) {
      if (Number.isFinite(oldReview[criteriaName + 'Rating'])) {
        business[criteriaName + '_rating_count']--;
        business[criteriaName + '_rating_total'] -= oldReview[criteriaName + 'Rating'];
      }

      if (Number.isFinite(newReview[criteriaName + 'Rating'])) {
        business[criteriaName + '_rating_count']++;
        business[criteriaName + '_rating_total'] += newReview[criteriaName + 'Rating'];
      }
    }

    const categoryIds = newReview.categories.map(getCategoryId);
    for (const categoryId of categoryIds) {
      if (!business.category_ids.includes(categoryId)) {
        business.category_ids.push(categoryId);
      }
    }
    business.category_ids.sort((a, b) => a - b);

    await updateBusinessAfterReview(tx, business.id, business);

    await db.query(`
      update reviews
        set content = $1,
        fat_rating = $2,
        trans_rating = $3,
        disabled_rating = $4,
        timestamp = $5,
        category_ids = $6
      where
        id = $7
    `, [
      newReview.content,
      newReview.fatRating || null,
      newReview.transRating || null,
      newReview.disabledRating || null,
      new Date(),
      categoryIds,
      reviewId
    ]);
  });
}

exports.getMostRecentReviews = async function() {
  const rows = await db.query(`
    select
      *,
      users.name as user_name,
      reviews.id as review_id
    from
      reviews, users, businesses
    where
      reviews.user_id = users.id and
      reviews.business_id = businesses.id
    order by
      reviews.timestamp
      desc
    limit 3`
  );
  return rows.map(row => {
    return {
      id: row.review_id,
      content: row.content,
      businessGoogleId: row.google_id,
      businessId: row.business_id,
      businessName: row.name,
      businessAddress: row.address,
      timestamp: row.timestamp.getTime(),
      fatRating: row.fat_rating,
      transRating: row.trans_rating,
      disabledRating: row.disabled_rating,
      user: {
        id: row.user_id,
        name: row.user_name
      },
    };
  });
}

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

exports.query = function() { return db.query.apply(db, arguments); }

exports.tx = function() { return db.tx.apply(db, arguments); };

exports.getBusinessReviewsById = async function(id) {
  const rows = await db.query(
  `select *, users.id as user_id, reviews.id as id
     from reviews, users
     where reviews.business_id = $1 and reviews.user_id = users.id
     order by reviews.timestamp desc`,
    [id]
  );
  return rows.map(reviewFromRow);
};

function reviewFromRow(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    content: row.content,
    timestamp: row.timestamp.getTime(),
    fatRating: row.fat_rating,
    transRating: row.trans_rating,
    disabledRating: row.disabled_rating,
    categories: row.category_ids.map(getCategoryTitle),
    user: {
      id: row.user_id,
      name: row.name
    },
  };
}

exports.getReviewById = async function(id) {
  const [row] = await db.query(
    `select * from reviews where id = $1 limit 1`,
    [id]
  );
  return row && reviewFromRow(row);
};

exports.getBusinessRatingBreakdown = async function(businessId) {
  const [row] = await db.query(RATING_BREAKDOWN_QUERY, [ businessId ]);
  const result = {};
  for (const criteriaName of CRITERIA_NAMES) {
    result[criteriaName] = {};

    let totalRatingCount = 0;
    for (const ratingValue of [1, 2, 3, 4, 5]) {
      const ratingCount = parseInt(row[`${criteriaName}_${ratingValue}_count`]);
      result[criteriaName][ratingValue] = {count: ratingCount, percentage: 0};
      totalRatingCount += ratingCount;
    }
    result[criteriaName].total = totalRatingCount;

    if (totalRatingCount > 0) {
      for (const ratingValue of [1, 2, 3, 4, 5]) {
        result[criteriaName][ratingValue].percentage = Math.round(
          result[criteriaName][ratingValue].count /
          totalRatingCount * 100
        );
      }
    }
  }
  return result;
}

exports.createUser = async function(user) {
  const rows = await db.query(
    `insert into users
     (name, facebook_id, email) values
     ($1, $2, $3) returning id`,
    [
      user.name,
      user.facebookId,
      user.email,
    ]
  );
  return rows[0].id;
};

exports.getUserById = async function(id) {
  const [row] = await db.query(
    'select * from users where id = $1 limit 1',
    [id]
  );

  if (row) {
    return {
      id: row.id,
      name: row.name,
      facebookId: row.facebook_id,
      email: row.email,
    }
  }
};

exports.findOrCreateUser = async function(user) {
  const row = await db.query(
    `insert into users
    (name, email, facebook_id) values
    ($1, $2, $3)
    on conflict (facebook_id)
    do update
      set name = $1, email = $2
    returning id`,
    [
      user.name,
      user.email,
      user.facebookId
    ]
  );
  return row[0].id;
}

exports.getProfileInformationForUser = async function(userId) {
  const reviewRows = await db.query(`
    select * from reviews where user_id = $1
  `, [userId]);

  return {reviews: reviewRows.map(reviewFromRow)};
}

const RATING_BREAKDOWN_QUERY_COLUMNS = [];

for (const criteriaName of CRITERIA_NAMES) {
  for (const ratingValue of [1, 2, 3, 4, 5]) {
    RATING_BREAKDOWN_QUERY_COLUMNS.push(
      `count(*) filter (where ${criteriaName}_rating = ${ratingValue}) as ${criteriaName}_${ratingValue}_count`
    );
  }
}

const RATING_BREAKDOWN_QUERY = `
  select
    ${RATING_BREAKDOWN_QUERY_COLUMNS.join(',\n')}
  from
    reviews where business_id = $1
`;
