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
  await db.renameColumn('business_tags', 'user_id', 'review_id');
};

exports.down = async function(db) {
  await db.renameColumn('business_tags', 'review_id', 'user_id');
};

exports._meta = {
  "version": 1
};
