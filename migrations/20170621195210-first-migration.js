'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  await db.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    account_kit_id: 'bigint',
    name: 'string',
    phone: 'string',
    email: 'string'
  });

  await db.createTable('businesses', {
    id: { type: 'serial', primaryKey: true },
    google_id: 'string',
    name: 'string',
    coordinates: 'geometry',
    phone: 'string',
    address: 'string',
    total_rating: 'int',
    review_count: 'int'
  });

  await db.createTable('reviews', {
    id: { type: 'serial', primaryKey: true },
    user_id: 'int',
    business_id: 'int',
    content: 'text',
    timestamp: 'timestamp',
    rating: 'int'
  });
};

exports.down = async function(db) {
  await db.dropTable('users');
  await db.dropTable('businesses');
  await db.dropTable('reviews');
};

exports._meta = {
  "version": 1
};
