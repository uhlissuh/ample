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
  await db.removeColumn('reviews', 'worker_id');
  await db.removeColumn('reviews', 'user_id');
  await db.removeColumn('users', 'id');
  await db.addColumn('reviews', 'worker_or_biz_id', 'int');
  await db.addColumn('reviews', 'account_kit_id', 'bigint');
  await db.addColumn('reviews', 'fat_slider', 'int');
  await db.addColumn('reviews', 'skill_slider', 'int');
  await db.addColumn('businesses', 'city', 'string');
  await db.addColumn('businesses', 'state', 'string');
  await db.addColumn('businesses', 'address1', 'string');
  await db.addColumn('businesses', 'address2', 'string');
  await db.addColumn('businesses', 'yelp_id', 'string');
  await db.addColumn('users', 'account_kit_id', 'bigint');
  await db.addColumn('users', 'phone_number', 'string');
};

exports.down = async function(db) {
  await db.addColumn('reviews', 'worker_id', 'int');
  await db.addColumn('reviews', 'user_id', 'int');
  await db.addColumn('users', 'id', 'int');
  await db.removeColumn('reviews', 'worker_or_biz_id');
  await db.removeColumn('reviews', 'account_kit_id');
  await db.removeColumn('reviews', 'fat_slider');
  await db.removeColumn('reviews', 'skill_slider');
  await db.removeColumn('businesses', 'city');
  await db.removeColumn('businesses', 'state');
  await db.removeColumn('businesses', 'address1');
  await db.removeColumn('businesses', 'address2');
  await db.removeColumn('businesses', 'yelp_id', 'string');
  await db.removeColumn('users', 'account_kit_id');
  await db.removeColumn('users', 'phone_number');
};

exports._meta = {
  "version": 1
};
