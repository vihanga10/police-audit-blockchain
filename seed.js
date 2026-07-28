/*
 * seed.js — loads the historical dataset into PostgreSQL.
 *
 * SCOPE (deliberate): seeds complaints, persons, case_events, and
 * evidence_descriptors — the four tables that already exist in the schema.
 * officers.csv, weapons_register.csv, court_records.csv,
 * property_register.csv, and order_book.csv need their own tables first;
 * that's a follow-up pass, not part of this script.
 *
 * RESHAPING: complaints.csv and case_events.csv are WIDE (one row per
 * complaint, with complainant/victim/witness or weapon-in/weapon-out as
 * side-by-side columns) because that's how officers fill paper registers.
 * The live app's tables are NORMALIZED (one row per person, arrays for
 * weapon serials) because that's how the running system already writes
 * data. This script reshapes wide CSV rows into the normalized shape on
 * the way in, so seeded historical data and live-captured data share one
 * schema — every dashboard query works the same way regardless of source.
 *
 * is_seeded=true marks every row this script writes, distinguishing
 * historical paper-archive data from complaints created live through the
 * app (which never set this flag, so it defaults to false).
 *
 * USAGE:
 *   cd ~/Desktop/Research
 *   node seed.js
 *
 * Requires: npm install pg csv-parse
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const BATCH_SIZE = 500;

const pool = new Pool({
  database: process.env.PGDATABASE || 'police_audit_db',
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
});

function readCsv(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true });
}

/** Splits a semicolon- or comma-separated list column into a clean array. */
function splitList(value) {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function nullIfEmpty(v) {
  return v === '' || v === undefined ? null : v;
}

/** Runs a batched multi-row INSERT for a fixed set of columns. */
async function batchInsert(client, table, columns, rows, onConflict = '') {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = chunk.map((row, r) => {
      const base = r * columns.length;
      values.push(...row);
      return `(${columns.map((_, c) => `$${base + c + 1}`).join(',')})`;
    });
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders.join(',')} ${onConflict}`;
    await client.query(sql, values);
    inserted += chunk.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
  }
  process.stdout.write('\n');
  return inserted;
}

async function seedComplaints(client, complaintsCsv) {
  console.log(`\nSeeding complaints (${complaintsCsv.length} rows)...`);
  const columns = [
    'complaint_number', 'station_code', 'station_name', 'station_name_si',
    'division', 'division_si', 'province', 'province_si',
    'station_latitude', 'station_longitude', 'complaint_title',
    'crime_type', 'crime_type_label', 'category', 'is_major_crime',
    'entry_date', 'entry_time', 'crime_date', 'crime_time', 'crime_hour',
    'crime_location', 'crime_latitude', 'crime_longitude',
    'mo_entry_method', 'mo_entry_method_si', 'mo_target_type',
    'mo_target_type_si', 'mo_time_pattern', 'mo_time_pattern_si',
    'mo_method_notes_si', 'is_seeded',
  ];
  const rows = complaintsCsv.map((r) => [
    r.complaint_number, r.station_code, r.station_name, r.station_name_si,
    r.division, r.division_si, r.province, r.province_si,
    nullIfEmpty(r.station_latitude), nullIfEmpty(r.station_longitude),
    nullIfEmpty(r.complaint_title), r.crime_type, r.crime_type_label,
    r.category, r.is_major_crime === 'true' || r.is_major_crime === 'True',
    r.entry_date, r.entry_time, r.crime_date, r.crime_time,
    parseInt(r.crime_hour, 10), nullIfEmpty(r.crime_location),
    nullIfEmpty(r.crime_latitude), nullIfEmpty(r.crime_longitude),
    nullIfEmpty(r.mo_entry_method), nullIfEmpty(r.mo_entry_method_si),
    nullIfEmpty(r.mo_target_type), nullIfEmpty(r.mo_target_type_si),
    nullIfEmpty(r.mo_time_pattern), nullIfEmpty(r.mo_time_pattern_si),
    nullIfEmpty(r.mo_method_notes_si), true,
  ]);
  return batchInsert(
    client, 'complaints', columns, rows,
    'ON CONFLICT (complaint_number) DO NOTHING',
  );
}

/**
 * Reshapes one wide complaints.csv row into up to 3 normalized person
 * rows: complainant (if reporting on behalf), victim, witness. Statement
 * text (victim_paragraph_text / witness_paragraph_text) is carried along
 * so a later pass can create matching `statements` rows if desired — this
 * script inserts persons only, since `statements` requires ledger
 * anchoring handled separately.
 */
function reshapePersons(personsCsv) {
  const rows = [];
  const seenComplainant = new Set(); // complaint_number already got its -C1
  const seenVictim = new Set();      // complaint_number already got its -V1
  const witnessCounter = {};         // complaint_number -> next witness index

  for (const r of personsCsv) {
    const cn = r.complaint_number;

    // A complaint may span multiple persons.csv rows (one per witness), each
    // repeating the same complainant/victim. Emit those only ONCE per
    // complaint_number, on the first row we see for it.
    if (r.complainant_name && !seenComplainant.has(cn)) {
      seenComplainant.add(cn);
      rows.push([
        `${cn}-C1`, cn, 'COMPLAINANT_ON_BEHALF',
        r.complainant_name, nullIfEmpty(r.complainant_nic),
        nullIfEmpty(r.complainant_dob), nullIfEmpty(r.complainant_gender),
        nullIfEmpty(r.complainant_address), nullIfEmpty(r.complainant_contact),
        nullIfEmpty(r.relationship_to_victim), false,
      ]);
    }
    if (r.victim_name && !seenVictim.has(cn)) {
      seenVictim.add(cn);
      rows.push([
        `${cn}-V1`, cn, r.complainant_name ? 'VICTIM' : 'VICTIM_SELF',
        r.victim_name, nullIfEmpty(r.victim_nic),
        nullIfEmpty(r.victim_dob), nullIfEmpty(r.victim_gender),
        nullIfEmpty(r.victim_address), nullIfEmpty(r.victim_contact),
        null, false,
      ]);
    }
    // Every row's witness is a DIFFERENT person — number them W1, W2, ...
    // per complaint, using a running counter, instead of always "-W1".
    if (r.witness_name) {
      witnessCounter[cn] = (witnessCounter[cn] || 0) + 1;
      const idx = witnessCounter[cn];
      rows.push([
        `${cn}-W${idx}`, cn, 'WITNESS',
        r.witness_name, nullIfEmpty(r.witness_nic),
        nullIfEmpty(r.witness_dob), nullIfEmpty(r.witness_gender),
        nullIfEmpty(r.witness_address), nullIfEmpty(r.witness_contact),
        null, false,
      ]);
    }
  }
  return rows;
}

async function seedPersons(client, personsCsv) {
  const rows = reshapePersons(personsCsv);
  console.log(`\nReshaped ${personsCsv.length} complaint rows into ${rows.length} person rows...`);
  const columns = [
    'person_id', 'complaint_number', 'role', 'full_name', 'nic_no',
    'date_of_birth', 'gender', 'address', 'contact_number',
    'relationship_to_victim', 'is_vulnerable',
  ];
  return batchInsert(
    client, 'persons', columns, rows,
    'ON CONFLICT (person_id) DO NOTHING',
  );
}

async function seedCaseEvents(client, eventsCsv) {
  console.log(`\nSeeding case_events (${eventsCsv.length} rows)...`);
  const columns = [
    'event_id', 'complaint_number', 'event_type', 'event_date', 'event_time',
    'officer_ids', 'purpose_of_visit', 'weapon_serials_out',
    'weapon_serials_in', 'narrative_text', 'attachment_cid',
    'recording_officer_id',
  ];
  const rows = eventsCsv.map((r) => [
    r.event_id, r.complaint_number, r.event_type, r.event_date, r.event_time,
    splitList(r.officers_involved_ids), nullIfEmpty(r.purpose_of_visit),
    splitList(r.weapons_carried_serial_no), splitList(r.weapons_returned_serial_no),
    nullIfEmpty(r.event_paragraph_text), nullIfEmpty(r.sketch_image_ref),
    splitList(r.officers_involved_ids)[0] || null,
  ]);
  return batchInsert(
    client, 'case_events', columns, rows,
    'ON CONFLICT (event_id) DO NOTHING',
  );
}

async function seedEvidence(client, evidenceCsv) {
  console.log(`\nSeeding evidence_descriptors (${evidenceCsv.length} rows)...`);
  const columns = [
    'descriptor_id', 'complaint_number', 'descriptor_type',
    'descriptor_value', 'descriptor_value_si',
  ];
  const rows = evidenceCsv.map((r) => [
    r.descriptor_id, r.complaint_number, r.descriptor_type,
    r.descriptor_value, nullIfEmpty(r.descriptor_value_si),
  ]);
  return batchInsert(
    client, 'evidence_descriptors', columns, rows,
    'ON CONFLICT (descriptor_id) DO NOTHING',
  );
}

async function main() {
  console.log('Reading CSVs...');
  const complaintsCsv = readCsv('complaints.csv');
  const personsCsv = readCsv('persons.csv');
  const eventsCsv = readCsv('case_events.csv');
  const evidenceCsv = readCsv('evidence_descriptors.csv');
  console.log(
    `Loaded: ${complaintsCsv.length} complaints, ${personsCsv.length} complaint-person-rows, ` +
    `${eventsCsv.length} events, ${evidenceCsv.length} evidence descriptors`,
  );

  const client = await pool.connect();
  try {
    // Order matters: complaints first (everything else references it),
    // then persons/events/evidence which all foreign-key to complaints.
    const nComplaints = await seedComplaints(client, complaintsCsv);
    const nPersons = await seedPersons(client, personsCsv);
    const nEvents = await seedCaseEvents(client, eventsCsv);
    const nEvidence = await seedEvidence(client, evidenceCsv);

    console.log('\n' + '='.repeat(60));
    console.log('SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`  complaints            : ${nComplaints}`);
    console.log(`  persons (reshaped)    : ${nPersons}`);
    console.log(`  case_events           : ${nEvents}`);
    console.log(`  evidence_descriptors  : ${nEvidence}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nSEEDING FAILED:', err.message);
  process.exit(1);
});
