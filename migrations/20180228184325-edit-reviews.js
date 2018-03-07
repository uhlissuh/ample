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
  await db.addColumn('reviews', 'body_positivity', {type: 'int'});
  await db.addColumn('reviews', 'poc_inclusivity', {type: 'int'});
  await db.addColumn('reviews', 'lgbtq_inclusivity', {type: 'int'});
  await db.addColumn('reviews', 'building_accessibility', {type: 'int'});
  await db.addColumn('reviews', 'furniture_size', {type: 'int'});

  await db.addColumn('businesses', 'body_positivity_rating_total', {type: 'int'});
  await db.addColumn('businesses', 'body_positivity_rating_count', {type: 'int'});
  await db.addColumn('businesses', 'poc_inclusivity_rating_total', {type: 'int'});
  await db.addColumn('businesses', 'poc_inclusivity_rating_count', {type: 'int'});
  await db.addColumn('businesses', 'lgbtq_inclusivity_rating_total', {type: 'int'});
  await db.addColumn('businesses', 'lgbtq_inclusivity_rating_count', {type: 'int'});
  await db.addColumn('businesses', 'building_accessibility_rating_total', {type: 'int'});
  await db.addColumn('businesses', 'building_accessibility_rating_count', {type: 'int'});
  await db.addColumn('businesses', 'furniture_size_rating_total', {type: 'int'});
  await db.addColumn('businesses', 'furniture_size_rating_count', {type: 'int'});

  await db.removeColumn('businesses', 'total_rating');
  await db.removeColumn('businesses', 'review_count');

  await db.removeColumn('reviews', 'rating');

  await db.removeColumn('users', 'phone');

};

exports.down = async function(db) {
  await db.removeColumn('reviews', 'body_positivity');
  await db.removeColumn('reviews', 'poc_inclusivity');
  await db.removeColumn('reviews', 'lgbtq_inclusivity');
  await db.removeColumn('reviews', 'building_accessibility');
  await db.removeColumn('reviews', 'furniture_size');

  await db.removeColumn('businesses', 'body_positivity_rating_total');
  await db.removeColumn('businesses', 'body_positivity_rating_count');
  await db.removeColumn('businesses', 'poc_inclusivity_rating_total');
  await db.removeColumn('businesses', 'poc_inclusivity_rating_count');
  await db.removeColumn('businesses', 'lgbtq_inclusivity_rating_total');
  await db.removeColumn('businesses', 'lgbtq_inclusivity_rating_count');
  await db.removeColumn('businesses', 'building_accessibility_rating_total');
  await db.removeColumn('businesses', 'building_accessibility_rating_count');
  await db.removeColumn('businesses', 'furniture_size_rating_total');
  await db.removeColumn('businesses', 'furniture_size_rating_count');

  await db.addColumn('businesses', 'total_rating', {type: 'int'});
  await db.addColumn('businesses', 'review_count', {type: 'int'});
  await db.addColumn('users', 'phone', {type: 'string'});
  await db.addColumn('reviews', 'rating', {type: 'int'});


};

exports._meta = {
  "version": 1
};
