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
  await db.createTable('business_categories', {
    worker_or_biz_id: 'int',
    category_id: 'int'
  })
};

exports.down = async function(db) {
  await db.dropTable('business_categories');
};

exports._meta = {
  "version": 1
};
