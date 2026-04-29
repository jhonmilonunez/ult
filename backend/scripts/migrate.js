import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema.sql');

async function migrate() {
  const schema = readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  try {
    await pool.query(
      `ALTER TABLE exercise_sets ADD CONSTRAINT exercise_sets_session_exercise_set_unique UNIQUE (session_id, exercise_id, set_number)`
    );
  } catch (e) {
    if (e.code !== '42P16' && e.code !== '42710') throw e;
  }
  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
