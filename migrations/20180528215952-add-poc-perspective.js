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
  await db.addColumn('reviews', 'poc_rating', {type: 'int'})
  await db.addColumn('businesses', 'poc_rating_total', {type: 'int', defaultValue: 0})
  await db.addColumn('businesses', 'poc_rating_count', {type: 'int', defaultValue: 0})
  return null;
};

exports.down = async function(db) {
  await db.removeColumn('reviews', 'poc_rating');
  await db.removeColumn('businesses', 'poc_rating_total');
  await db.removeColumn('businesses', 'poc_rating_count');
};

exports._meta = {
  "version": 1
};
