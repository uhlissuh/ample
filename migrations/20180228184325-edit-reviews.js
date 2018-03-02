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
    await db.addColumn('reviews', 'sturdy_seating', {type: 'boolean'});
    await db.addColumn('reviews', 'armless_chairs', {type: 'boolean'});
    await db.addColumn('reviews', 'wide_table_spacing', {type: 'boolean'});
    await db.addColumn('reviews', 'wide_exam_table', {type: 'boolean'});
    await db.addColumn('reviews', 'bench_seating', {type: 'boolean'});
    await db.addColumn('reviews', 'wheelchair_accessible', {type: 'boolean'});
    await db.addColumn('reviews', 'handicap_parking', {type: 'boolean'});
    await db.addColumn('reviews', 'dedicated_parking', {type: 'boolean'});
    await db.addColumn('reviews', 'stairs_required', {type: 'boolean'});
    await db.addColumn('reviews', 'weight_neutral', {type: 'boolean'});
    await db.addColumn('reviews', 'haes_informed', {type: 'boolean'});
    await db.addColumn('reviews', 'fat_positive', {type: 'boolean'});
    await db.addColumn('reviews', 'lgbtq_friendly', {type: 'boolean'});
    await db.addColumn('reviews', 'trans_friendly', {type: 'boolean'});
    await db.addColumn('reviews', 'poc_centered', {type: 'boolean'});
};

exports.down = async function(db) {
  await db.removeColumn('reviews', 'sturdy_seating');
  await db.removeColumn('reviews', 'armless_chairs');
  await db.removeColumn('reviews', 'wide_table_spacing');
  await db.removeColumn('reviews', 'wide_exam_table');
  await db.removeColumn('reviews', 'bench_seating');
  await db.removeColumn('reviews', 'wheelchair_accessible');
  await db.removeColumn('reviews', 'handicap_parking');
  await db.removeColumn('reviews', 'dedicated_parking');
  await db.removeColumn('reviews', 'stairs_required');
  await db.removeColumn('reviews', 'weight_neutral');
  await db.removeColumn('reviews', 'haes_informed');
  await db.removeColumn('reviews', 'fat_positive');
  await db.removeColumn('reviews', 'lgbtq_friendly');
  await db.removeColumn('reviews', 'poc_centered');
  await db.removeColumn('reviews', 'trans_friendly');
};

exports._meta = {
  "version": 1
};
