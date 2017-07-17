#!/usr/bin/env node

const pgp = require('pg-promise')();
const databaseConfig = require('../database.json')
const db = pgp(databaseConfig.dev);

const subcategoriesByCategory = {
  Doctors: [
    'Allergy/Immunology',
    'Anesthesiology',
    'Cardiology',
    'Dermatology',
    'Gastroenterology',
    'Hematology/Oncology',
    'Internal Medicine',
    'Nephrology',
    'Neurology',
    'Neurosurgery',
    'OB/GYN',
    'Nurse-Midwifery',
    'Occupational Medicine',
    'Ophthalmology',
    'Oral Surgery',
    'Orthopaedic Surgery',
    'Pathology',
    'Pediatrics',
    'Podiatry',
    'Pulmonary Medicine',
    'Radiation Onconlogy',
    'Diagnostic Radiology',
    'Rheumatology',
    'Urology',
    'Family Medicine',
    'Geriatrics',
    'Sleep Medicine',
    'Otolaryngology/ENT',
    'Emergency Medicine',
    'General Surgery',
    'Thoracic Surgery',
    'Sports Medicine',
    'Colon/Rectal Surgery',
    'Pain Medicine',
    'Infectious Disease',
    'Endocrinology',
  ],
  Fashion: [
    'Online',
    'Retail',
  ],
  Fitness: [
  'Gym',
  'Dance Classes',
  'Personal Trainer',
  'Physical Therapy',
  ],
  Wellness: [
    'Massage',
    'Yoga',
    'Acupuncture',
    'Reiki',
    'Chiropractic',
  ],
  Beauty: [
    'Hair Dresser',
    'Barber',
    'Makeup Artist',
    'Waxing',
    'Manicurist/Nail Technician',
  ],
  'Mental Health': [
    'Psychiatrist',
    'Clinical Social Worker',
    'Psychologist'
  ],
  'Professional Services': [
    'Attorney',
  ]


}

async function main() {
  for (const category in subcategoriesByCategory) {
    const subcategories = subcategoriesByCategory[category]

    const categoryId = (await db.query(
      'select id from categories where name = $1 limit 1', category
    ))[0].id

    for (const subcategory of subcategories) {
      await db.query(
        'insert into subcategories (category_id, name) select $1, $2 where not exists (select name from subcategories where name = $2)',
        [categoryId, subcategory]
      )
    }
  }

  console.log('done')
  pgp.end()
}

main()
//
// INSERT INTO example_table
//     (id, name)
// SELECT 1, 'John'
// WHERE
//     NOT EXISTS (
//         SELECT id FROM example_table WHERE id = 1
//     );
