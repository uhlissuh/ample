var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  await db.changeColumn('reviews', 'business_id', {
    type: 'int',
    foreignKey: {
      table: 'businesses',
      mapping: 'id'
    },
    notNull: true,
  });

  await db.addIndex('reviews', 'reviews_business_id', ['business_id'])
};

exports.down = async function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
