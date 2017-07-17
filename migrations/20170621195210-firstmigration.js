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
  await db.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    email: 'string',
    location: 'geometry'
  });
  await db.createTable('workers', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    business_id: 'int'
  });
  await db.createTable('reviews', {
    id: { type: 'serial', primaryKey: true },
    user_id: 'int',
    worker_id: 'int',
    content: 'text',
    timestamp: 'timestamp'
  });
  await db.createTable('businesses', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    location: 'geometry',
    phone_number: 'string',
    category_id: 'int'
  });

};

exports.down = async function(db) {
  await db.dropTable('users');
  await db.dropTable('workers');
  await db.dropTable('reviews');
  await db.dropTable('businesses');
};

exports._meta = {
  "version": 1
};
