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
  await db.createTable('tags', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'string', unique: true }
  });

  await db.createTable('business_tags', {
    id: { type: 'serial', primaryKey: true },
    business_id: { type: 'int', notNull: true },
    tag_id: { type: 'int', notNull: true },
    user_id: { type: 'int', notNull: true }
  });
};

exports.down = async function(db) {
  await db.dropTable('tags');
  await db.dropTable('business_tags');
};

exports._meta = {
  "version": 1
};
