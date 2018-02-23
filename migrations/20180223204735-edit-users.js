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
  await db.removeColumn('users', 'account_kit_id');
  await db.addColumn('users', 'facebook_id', {type: 'string', unique: true});
};

exports.down = async function(db) {
  await db.addColumn('users', 'account_kit_id', 'string');
  await db.removeColumn('users', 'facebook_id');

};

exports._meta = {
  "version": 1
};
