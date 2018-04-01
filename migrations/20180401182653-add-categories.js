var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  await db.createTable('categories', {
    id: { type: 'serial', primaryKey: true },
    title: {type: 'string', unique: true},
    parent_id: 'int'
  });

  await db.addColumn('reviews', 'category_ids', {
    type: 'integer[]'
  });

  await db.addColumn('businesses', 'category_ids', {
    type: 'integer[]'
  });
};

exports.down = async function(db) {
  await db.dropTable('categories');
  await db.removeColumn('reviews', 'category_ids');
  await db.removeColumn('businesses', 'category_ids');
};

exports._meta = {
  "version": 1
};
