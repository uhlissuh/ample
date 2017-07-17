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
  await db.createTable('categories', {
    id: { type: 'serial', primaryKey: true },
    parent_id: 'int',
    title: 'string',
    alias: 'string'
  })
};

exports.down = async function(db) {
  await db.dropTable('categories');
};

exports._meta = {
  "version": 1
};
