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
  await db.addColumn('businesses', 'owner_id', {type: 'int'});
  await db.addColumn('businesses', 'owner_statement', {type: 'string'});
  await db.addColumn('businesses', 'owner_is_confirmed', {type: 'boolean'});
  await db.addColumn('businesses', 'taken_pledge', {type: 'boolean'});
};

exports.down = async function(db) {
  await db.removeColumn('businesses', 'owner_id');
  await db.removeColumn('businesses', 'owner_statement');
  await db.removeColumn('businesses', 'owner_is_confirmed');
  await db.removeColumn('businesses', 'taken_pledge');

};

exports._meta = {
  "version": 1
};
