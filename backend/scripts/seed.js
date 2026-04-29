import 'dotenv/config';
import bcrypt from 'bcrypt';
import { query } from '../db.js';

const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo1234',
  name: 'Demo User',
};

const EXERCISES = [
  { name: 'Bench Press', category: 'Chest', equipment: 'Barbell' },
  { name: 'Incline Dumbbell Press', category: 'Chest', equipment: 'Dumbbell' },
  { name: 'Cable Fly', category: 'Chest', equipment: 'Cable' },
  { name: 'Push-Up', category: 'Chest', equipment: 'Bodyweight' },
  { name: 'Barbell Row', category: 'Back', equipment: 'Barbell' },
  { name: 'Pull-Up', category: 'Back', equipment: 'Bodyweight' },
  { name: 'Lat Pulldown', category: 'Back', equipment: 'Cable' },
  { name: 'Dumbbell Row', category: 'Back', equipment: 'Dumbbell' },
  { name: 'Squat', category: 'Legs', equipment: 'Barbell' },
  { name: 'Romanian Deadlift', category: 'Legs', equipment: 'Barbell' },
  { name: 'Leg Press', category: 'Legs', equipment: 'Machine' },
  { name: 'Lunge', category: 'Legs', equipment: 'Dumbbell' },
  { name: 'Overhead Press', category: 'Shoulders', equipment: 'Barbell' },
  { name: 'Dumbbell Lateral Raise', category: 'Shoulders', equipment: 'Dumbbell' },
  { name: 'Face Pull', category: 'Shoulders', equipment: 'Cable' },
  { name: 'Barbell Curl', category: 'Arms', equipment: 'Barbell' },
  { name: 'Tricep Pushdown', category: 'Arms', equipment: 'Cable' },
  { name: 'Hammer Curl', category: 'Arms', equipment: 'Dumbbell' },
  { name: 'Plank', category: 'Core', equipment: 'Bodyweight' },
  { name: 'Cable Crunch', category: 'Core', equipment: 'Cable' },
];

async function seed() {
  const { rows: userExists } = await query(
    'SELECT id FROM users WHERE email = $1',
    [DEMO_USER.email]
  );
  if (userExists.length === 0) {
    const hash = await bcrypt.hash(DEMO_USER.password, 10);
    await query(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)`,
      [DEMO_USER.email, DEMO_USER.name, hash]
    );
    console.log('Demo user created. Log in with:');
    console.log(`  Email: ${DEMO_USER.email}`);
    console.log(`  Password: ${DEMO_USER.password}`);
  }

  const { rows: existing } = await query('SELECT COUNT(*)::int AS c FROM exercises');
  if (existing[0].c > 0) {
    console.log('Exercises already seeded. Skipping.');
    process.exit(0);
    return;
  }
  for (const e of EXERCISES) {
    await query(
      `INSERT INTO exercises (name, category, equipment) VALUES ($1, $2, $3)`,
      [e.name, e.category, e.equipment]
    );
  }
  console.log(`Seeded ${EXERCISES.length} exercises.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
