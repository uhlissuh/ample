'use strict';

var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  db.renameColumn('reviews', 'body_positivity', 'fat_rating');
  db.renameColumn('reviews', 'lgbtq_inclusivity', 'trans_rating');
  db.renameColumn('reviews', 'building_accessibility', 'disabled_rating');
  db.removeColumn('reviews', 'poc_inclusivity');
  db.removeColumn('reviews', 'furniture_size');

  db.renameColumn('businesses', 'body_positivity_rating_total', 'fat_rating_total');
  db.renameColumn('businesses', 'body_positivity_rating_count', 'fat_rating_count');
  db.renameColumn('businesses', 'lgbtq_inclusivity_rating_total', 'trans_rating_total');
  db.renameColumn('businesses', 'lgbtq_inclusivity_rating_count', 'trans_rating_count');
  db.renameColumn('businesses', 'building_accessibility_rating_total', 'disabled_rating_total');
  db.renameColumn('businesses', 'building_accessibility_rating_count', 'disabled_rating_count');
  db.removeColumn('businesses', 'poc_inclusivity_rating_count');
  db.removeColumn('businesses', 'poc_inclusivity_rating_total');
  db.removeColumn('businesses', 'furniture_size_rating_count');
  db.removeColumn('businesses', 'furniture_size_rating_total');
};

exports.down = async function(db) {
  db.renameColumn('reviews', 'fat_rating', 'body_positivity');
  db.renameColumn('reviews', 'trans_rating', 'lgbtq_inclusivity');
  db.renameColumn('reviews', 'disabled_rating', 'building_accessibility');
  db.addColumn('reviews', 'poc_inclusivity', 'int');
  db.addColumn('reviews', 'furniture_size', 'int');

  db.renameColumn('businesses', 'fat_rating_total', 'body_positivity_rating_total');
  db.renameColumn('businesses', 'fat_rating_count', 'body_positivity_rating_count');
  db.renameColumn('businesses', 'trans_rating_total', 'lgbtq_inclusivity_rating_total');
  db.renameColumn('businesses', 'trans_rating_count', 'lgbtq_inclusivity_rating_count');
  db.renameColumn('businesses', 'disabled_rating_total', 'building_accessibility_rating_total');
  db.renameColumn('businesses', 'disabled_rating_count', 'building_accessibility_rating_count');
  db.addColumn('businesses', 'poc_inclusivity_rating_count', 'int');
  db.addColumn('businesses', 'poc_inclusivity_rating_total', 'int');
  db.addColumn('businesses', 'furniture_size_rating_count', 'int');
  db.addColumn('businesses', 'furniture_size_rating_total', 'int');
};

exports._meta = {
  "version": 1
};
