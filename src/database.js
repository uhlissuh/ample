const pgp = require("pg-promise")();
const databaseConfig = require("../database.json");
let db = null;

const CRITERIA_NAMES = [
  'fat',
  'trans',
  'disabled',
  'poc'
];

let ALL_CATEGORIES, CATEGORY_IDS_BY_TITLE, CATEGORY_TITLES_BY_ID, CHILD_CATEGORIES_BY_PARENT_CATEGORY;

exports.connect = async function(environment) {
  let config = databaseConfig[environment];
  if (config.ENV) config = process.env[config.ENV];
  db = pgp(config);

  ALL_CATEGORIES = [];
  CATEGORY_IDS_BY_TITLE = {};
  CATEGORY_TITLES_BY_ID = {};
  CHILD_CATEGORIES_BY_PARENT_CATEGORY = {};
  const rows = await db.query('select * from categories');
  for (const row of rows) {
    ALL_CATEGORIES.push(row.title);
    CATEGORY_IDS_BY_TITLE[row.title.toLowerCase()] = row.id;
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
  Object.freeze(ALL_CATEGORIES);
};

exports.clear = async function() {
  await db.query("delete from reviews");
  await db.query("delete from businesses");
  await db.query("delete from users");
  await db.query("delete from business_tags");
  await db.query("delete from tags");
};

exports.getBusinessByGoogleId = async function(googleId) {
  const rows = await db.query(
    `
      select *, ST_x(coordinates) as latitude, ST_y(coordinates) as longitude
      from businesses
      where google_id = $1 limit 1
    `,
    googleId
  );
  return (await businessesFromRows(db, rows))[0];
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
  return businessesFromRows(db, rows);
}

exports.getBusinessById = async function(id) {
  const rows = await db.query(
    `
      select *, ST_x(coordinates) as latitude, ST_y(coordinates) as longitude
      from businesses
      where id = $1 limit 1
    `,
    id
  );
  return (await businessesFromRows(db, rows))[0];
};

exports.getBusinessesByCategoryandLocation = async function(
  category,
  latitude,
  longitude
) {
  const categoryId = getCategoryId(category);
  const businessRows = await db.query(`
    select distinct
      businesses.*,
      ST_x(businesses.coordinates) as latitude,
      ST_y(businesses.coordinates) as longitude
    from
      businesses
    where
      ST_DistanceSphere(businesses.coordinates, ST_MakePoint($1, $2)) <= 50000 and
      $3 = ANY (businesses.category_ids)
  `, [latitude, longitude, categoryId]);
  return businessesFromRows(db, businessRows);
};

exports.searchAddedBusinesses = async function(query, lat, lng) {
  query = query.replace(/[^\w\s]/g, ' ').trim().split(/\s+/).join(' & ');
  if (query === '') return []
  const rows = await db.query(`
    select *
    from businesses
    where to_tsvector('english', name) @@ to_tsquery('english', $1) and
    google_id is null and
    ST_DistanceSphere(businesses.coordinates, ST_MakePoint($2, $3)) <= 75000
    ;
  `, [query, lat, lng]);
  return businessesFromRows(db, rows);
};

async function businessesFromRows(tx, rows) {
  if (rows.length === 0) return [];

  const businesses = rows.map(row => {
    const business = {
      id: row.id,
      name: row.name,
      address: row.address,
      googleId: row.google_id,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      reviewCount: row.review_count,
      categories: row.category_ids.map(getCategoryTitle),
      userId: row.user_id,
      ownerId: row.owner_id,
      takenPledge: row.taken_pledge,
      ownerStatement: row.owner_statement,
      ownershipConfirmed: row.owner_is_confirmed

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
  });

  const businessIds = businesses.map(business => business.id);

  const tagRows = await tx.query(`
    select
      business_id, name, count(*) as count
    from
      business_tags, tags
    where
      business_tags.business_id = ANY ($1) and
      business_tags.tag_id = tags.id and
      is_pending = false
    group by
      business_id, name
    order by
      count desc
  `, [businessIds]);

  const tagsByBusiness = {};
  for (const row of tagRows) {
    if (!tagsByBusiness[row.business_id]) {
      tagsByBusiness[row.business_id] = [row.name];
    } else {
      tagsByBusiness[row.business_id].push(row.name);
    }
  }

  for (const business of businesses) {
    business.tags = tagsByBusiness[business.id] || [];
  }

  return businesses;
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
      "(name, google_id, address, phone, user_id, coordinates, category_ids) values " +
      "($1, $2, $3, $4, $5, ST_MakePoint($6, $7), $8::int[]) returning id",
    [
      business.name,
      business.googleId,
      business.address,
      business.phone,
      business.userId,
      parseFloat(business.latitude),
      parseFloat(business.longitude),
      (business.categories || []).map(getCategoryId)
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
        poc_rating_total = $8,
        poc_rating_count = $9,
        review_count = $10,
        category_ids = $11
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
      businessRow.poc_rating_total,
      businessRow.poc_rating_count,
      businessRow.review_count,
      businessRow.category_ids
    ]
  )
}

function getCategoryId(title) {
  const result = CATEGORY_IDS_BY_TITLE[title.toLowerCase()];
  if (!result) throw new Error(`Invalid category '${title}'`);
  return result;
}

function getCategoryTitle(id) {
  return CATEGORY_TITLES_BY_ID[id];
}

exports.hasCategory = function(category) {
  if (category) {
    return category.toLowerCase() in CATEGORY_IDS_BY_TITLE;
  }
}

exports.getChildCategoriesByParentCategory = async function() {
  return CHILD_CATEGORIES_BY_PARENT_CATEGORY;
};

exports.getAllCategories = async function() {
  return ALL_CATEGORIES;
};

async function addTagsToReview(tx, reviewId, businessId, tags) {
  const rows = await tx.query(`
    insert into tags
      (name, is_pending)
    select * from
      unnest ($1::text[], $2::boolean[])
    on conflict (name)
    do update
      set name = excluded.name
    returning id
  `, [tags, tags.map(tag => true)]);

  const tagIds = rows.map(row => row.id);
  const reviewIds = tags.map(tag => reviewId);
  const businessIds = tags.map(tag => businessId);

  await tx.query(`
    insert into business_tags
      (review_id, business_id, tag_id)
      select * from
        unnest ($1::int[], $2::int[], $3::int[])
  `, [reviewIds, businessIds, tagIds]);
}

async function removeTagsFromReview(tx, reviewId, tags) {
  const rows = await tx.query(`
    select id from tags where name = ANY ($1::text[])
  `, [tags]);

  const tagIds = rows.map(row => row.id);

  await tx.query(`
    delete from business_tags
    where
      review_id = $1 and
      tag_id = ANY ($2::int[])
  `, [reviewId, tagIds]);
}

exports.claimBusiness = async function(userId, businessId, takenPledge, ownerStatement) {
  await db.query(
    `
      update businesses
      set
        owner_id = $1,
        taken_pledge = $2,
        owner_statement = $3,
        owner_is_confirmed = false
      where
        id = $4
    `, [userId, takenPledge, ownerStatement, businessId]
  )
}

exports.confirmBusinessOwner = async function(businessId) {
  await db.query(
    `
    update businesses
      set owner_is_confirmed = true
    where
      id = $1
    `, [businessId]
  )
}

exports.findOwnedBusinesses = async function(userId) {
  const rows = await db.query(
    `select *
    from businesses
    where
    owner_id = $1
    `,
    [userId]
  )
  return businessesFromRows(db, rows);
}

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

    const [row] = await tx.query(
      `insert into reviews
        (
          business_id, user_id, content, timestamp, category_ids,
          fat_rating, trans_rating, disabled_rating, poc_rating
        )
        values
        (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
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
        review.pocRating || null
      ]
    );

    if (review.tags && review.tags.length > 0) {
      await addTagsToReview(tx, row.id, businessId, review.tags);
    }

    return row.id;
  });
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

    if (!newReview.tags) newReview.tags = [];
    const tagsToDelete = oldReview.tags.filter(tag => !newReview.tags.includes(tag));
    const tagsToInsert = newReview.tags.filter(tag => !oldReview.tags.includes(tag));

    await addTagsToReview(tx, reviewId, business.id, tagsToInsert);
    await removeTagsFromReview(tx, reviewId, tagsToDelete);

    await updateBusinessAfterReview(tx, business.id, business);

    await db.query(`
      update reviews
        set content = $1,
        fat_rating = $2,
        trans_rating = $3,
        disabled_rating = $4,
        poc_rating = $5,
        timestamp = $6,
        category_ids = $7
      where
        id = $8
    `, [
      newReview.content,
      newReview.fatRating || null,
      newReview.transRating || null,
      newReview.disabledRating || null,
      newReview.pocRating || null,
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

exports.getAllReviewsForMap = async function() {
  const rows = await db.query(
    `select
      *,
      ST_x(businesses.coordinates) as latitude,
      ST_y(businesses.coordinates) as longitude,
      users.name as user_name,
      reviews.id as review_id
    from
      reviews, users, businesses
    where
      reviews.user_id = users.id and
      reviews.business_id = businesses.id
      order by reviews.timestamp desc
      `
  );

  return rows.map(row => {
    return {
      id: row.review_id,
      content: row.content,
      businessGoogleId: row.google_id,
      businessId: row.business_id,
      businessName: row.name,
      businessAddress: row.address,
      businessLatitude: row.latitude,
      businessLongitude: row.longitude,
      timestamp: row.timestamp.getTime(),
      fatRating: row.fat_rating,
      transRating: row.trans_rating,
      disabledRating: row.disabled_rating,
      pocRating: row.poc_rating,
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
  return reviewsFromRows(db, rows);
};

exports.addBusinessPhoto = async function(businessId, userId, {url, width, height}) {
  await db.query(`
    insert into business_photos
    (business_id, user_id, url, width, height)
    values
    ($1, $2, $3, $4, $5)
  `, [businessId, userId, url, width, height])
}

exports.getBusinessPhotosById = async function(id) {
  id = parseInt(id)
  if (Number.isNaN(id)) return []
  const rows = await db.query(
    `select * from business_photos where business_id = $1`,
    [id]
  )
  return rows.map(row => ({
    userId: row.user_id,
    url: row.url,
    width: row.width,
    height: row.height
  }))
}

async function reviewsFromRows(tx, rows) {
  const tagRows = await tx.query(`
    select
      review_id, name
    from
      business_tags, tags
    where
      business_tags.review_id = ANY ($1::int[]) and
      business_tags.tag_id = tags.id
    order by
      business_tags.id
  `, [rows.map(row => row.id)]);

  const tagsByReviewId = {};
  for (const {review_id, name} of tagRows) {
    if (tagsByReviewId[review_id]) {
      tagsByReviewId[review_id].push(name);
    } else {
      tagsByReviewId[review_id] = [name];
    }
  }

  return rows.map(row => {
    return {
      id: row.id,
      businessId: row.business_id,
      content: row.content,
      timestamp: row.timestamp.getTime(),
      fatRating: row.fat_rating,
      transRating: row.trans_rating,
      disabledRating: row.disabled_rating,
      pocRating: row.poc_rating,
      categories: row.category_ids.map(getCategoryTitle),
      user: {
        id: row.user_id,
        name: row.name
      },
      tags: tagsByReviewId[row.id] || []
    };
  });
}

exports.getReviewById = async function(id) {
  const [row] = await db.query(
    `select * from reviews where id = $1 limit 1`,
    [id]
  );
  if (row) {
    return (await reviewsFromRows(db, [row]))[0];
  }
};

exports.getAllReviews = async function() {
  return [row] = await db.query(
    `select *,
      users.id as user_id,
      businesses.id as business_id,
      reviews.id as review_id,
      users.name as user_name,
      businesses.name as business_name
    from
      reviews, users, businesses
    where
      reviews.user_id = users.id
    and
      reviews.business_id = businesses.id
    order by
      reviews.timestamp desc`
  )
}

exports.getApprovedTags = async function() {
  const rows = await db.query('select name from tags where is_pending is false');
  return rows.map(row => row.name);
}

exports.getPendingTags = async function() {
  const rows = await db.query('select name from tags where is_pending = true');
  return rows.map(row => row.name);
};


exports.createApprovedTags = async function(tags) {
  await db.query(`
    insert into tags
      (name, is_pending)
    select * from
      unnest ($1::text[], $2::boolean[])
    on conflict (name)
    do nothing
  `, [tags, tags.map(tag => false)]);
};

exports.approveTag = async function(tag) {
  await db.query(`
    update tags
    set is_pending = false
    where name = $1
  `, [tag]);
};

exports.getBusinessesWithUnconfirmedOwners = async function() {
  const rows = await db.query(
    `select *, businesses.id as business_id, users.name as owner_name, users.id as owner_id, businesses.name as business_name
     from businesses, users
     where
     businesses.owner_id = users.id and
     businesses.owner_is_confirmed = false
     `
   );
  return rows;
};

exports.approveOwner = async function(businessId) {
  await db.query(`
    update businesses
    set owner_is_confirmed = true
    where id = $1
  `, [businessId]);
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
      googleId: row.google_id,
      email: row.email,
    }
  }
};

exports.findOrCreateUser = async function(user) {
  return db.tx(async tx => {
    if (user.googleId) {
      const [row] = await tx.query(`
        select * from users where email = $1 or google_id = $2 limit 1
      `, [
        user.email,
        user.googleId
      ]);

      if (row) {
        await tx.query(`
          update users
          set name = $1, email = $2, google_id = $3
          where id = $4
        `, [
          user.name,
          user.email,
          user.googleId,
          row.id
        ]);
        return row.id
      } else {
        const [row] = await tx.query(`
          insert into users
            (name, email, google_id)
          values
            ($1, $2, $3)
          returning id
        `, [
          user.name,
          user.email,
          user.googleId
        ]);

        return row.id;
      }
    } else {
      const [row] = await tx.query(`
        select * from users where email = $1 or facebook_id = $2 limit 1
      `, [
        user.email,
        user.facebookId
      ]);

      if (row) {
        await tx.query(`
          update users
          set name = $1, email = $2, facebook_id = $3
          where id = $4
        `, [
          user.name,
          user.email,
          user.facebookId,
          row.id
        ]);
        return row.id
      } else {
        const [row] = await tx.query(`
          insert into users
            (name, email, facebook_id)
          values
            ($1, $2, $3)
          returning id
        `, [
          user.name,
          user.email,
          user.facebookId
        ]);

        return row.id;
      }
    }
  });
}

exports.getProfileInformationForUser = async function(userId) {
  const reviewRows = await db.query(`
    select * from reviews where user_id = $1
  `, [userId]);
  return {reviews: await reviewsFromRows(db, reviewRows)};
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
