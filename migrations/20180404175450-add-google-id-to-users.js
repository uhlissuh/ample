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
  await db.addColumn('users', 'google_id', {type: 'string', unique: true});
  await db.changeColumn('users', 'email', {type: 'string', unique: true, notNull: true});
};

exports.down = async function(db) {
  await db.removeColumn('users', 'google_id');
};

exports._meta = {
  "version": 1
};
