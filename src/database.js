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
      `insert into reviews
        (business_id, user_id, content, timestamp, rating, sturdy_seating,
          armless_chairs, wide_table_spacing, wide_exam_table, bench_seating, wheelchair_accessible,
          handicap_parking, dedicated_parking, stairs_required, weight_neutral,
          haes_informed, fat_positive, lgbtq_friendly, trans_friendly, poc_centered)
        values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        returning id`,
      [
        businessId,
        userId,
        review.content,
        new Date(),
        review.rating,
        review.sturdySeating,
        review.armlessChairs,
        review.wideTableSpacing,
        review.wideTable,
        review.benchSeating,
        review.wheelchair,
        review.handicapParking,
        review.dedicatedParking,
        review.stairsRequired,
        review.weightNeutral,
        review.haes,
        review.fatPositive,
        review. lgbtq,
        review.transFriendly,
        review.pocCentered
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
    "select * from reviews, users where business_id = $1 and reviews.user_id = users.id order by reviews.timestamp desc",
    [id]
  );
  return rows.map(row => {
    return {
      id: row.id,
      content: row.content,
      rating: row.rating,
      timestamp: row.timestamp.getTime(),
      sturdySeating: row.sturdy_seating,
      armlessChairs: row.armless_chairs,
      wideTableSpacing: row.wide_table_spacing,
      wideTable: row.wide_exam_table,
      benchSeating: row.bench_seating,
      wheelchair: row.wheelchair_accessible,
      dedicatedParking: row.dedicated_parking,
      handicapParking: row.handicap_parking,
      stairsRequired: row.stairs_required,
      weightNeutral: row.weight_neutral,
      haes: row.haes_informed,
      fatPositive: row.fat_positive,
      lgbtq: row.lgbtq_friendly,
      transFriendly: row.trans_friendly,
      pocCentered: row.poc_centered,
      user: {
        id: row.user_id,
        name: row.name
      },

    };
  });
};

exports.createUser = async function(user) {
  const rows = await db.query(
    `insert into users
     (name, facebook_id, email, phone) values
     ($1, $2, $3, $4) returning id`,
    [
      user.name,
      user.facebookId,
      user.email,
      user.phone,
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
      phone: row.phone
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
