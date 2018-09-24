var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = async function(db) {
  await db.createTable('business_photos', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'int' },
    business_id: { type: 'int' },
    url: { type: 'string', notNull: true },
    width: { type: 'int' },
    height: { type: 'int' }
  });
  await db.addIndex('business_photos', 'business_photos_business_id', ['business_id'])
};

exports.down = async function(db) {
  await db.removeIndex('business_photos', 'business_photos_business_id');
  await db.dropTable('business_photos');
};

exports._meta = {
  "version": 1
};
