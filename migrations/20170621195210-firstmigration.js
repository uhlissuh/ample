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
    name: 'string'
  });
  await db.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    email: 'string',
    location: 'geometry'
  });
  await db.createTable('servicers', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    location: 'geometry',
    business_id: 'int',
    category_id: 'int',
    specialty: 'string'
  });
  await db.createTable('reviews', {
    id: { type: 'serial', primaryKey: true },
    user_id: 'int',
    servicer_id: 'int',
    content: 'text',
    timestamp: 'datetime'
  });
  await db.createTable('businesses', {
    id: { type: 'serial', primaryKey: true },
    name: 'string',
    location: 'geometry',
    phone_number: 'string'
  });

};

exports.down = async function(db) {
  await db.dropTable('categories');
  await db.dropTable('users');
  await db.dropTable('servicers');
  await db.dropTable('reviews');
};

exports._meta = {
  "version": 1
};
