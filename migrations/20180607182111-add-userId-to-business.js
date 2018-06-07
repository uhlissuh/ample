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
  await db.addColumn('businesses', 'user_id', {type: 'int'})
};

exports.down = async function(db) {
  await db.removeColumn('businesses', 'user_id');

};

exports._meta = {
  "version": 1
};
