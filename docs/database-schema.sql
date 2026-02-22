-- =============================================================================
-- Workout Tracker — PostgreSQL Database Schema
-- Supports: users, exercises, sessions, exercise sets (logs), history, calendar
-- =============================================================================

-- Enable UUID extension (optional; use SERIAL if you prefer integer IDs)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  name            VARCHAR(255),
  password_hash   VARCHAR(255) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- -----------------------------------------------------------------------------
-- Exercises (searchable exercise database — supports faceted search)
-- -----------------------------------------------------------------------------
CREATE TABLE exercises (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  category   VARCHAR(100),  -- e.g. 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'
  equipment  VARCHAR(100),  -- e.g. 'Barbell', 'Dumbbell', 'Kettlebell', 'Bodyweight', 'Cable', 'Machine'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_equipment ON exercises(equipment);
-- Optional fuzzy search: CREATE EXTENSION pg_trgm; then CREATE INDEX idx_exercises_name_trgm ON exercises USING gin(name gin_trgm_ops);
CREATE INDEX idx_exercises_name_lower ON exercises(LOWER(name));

-- -----------------------------------------------------------------------------
-- Sessions (one per workout — supports attendance calendar)
-- -----------------------------------------------------------------------------
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMPTZ,  -- null while session is in progress
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- Exercise sets (logs: weight + reps per set within a session)
-- Supports in-context history by querying sets for user + exercise across sessions
-- -----------------------------------------------------------------------------
CREATE TABLE exercise_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number  INT NOT NULL,           -- 1-based order within this exercise in this session
  weight_kg   DECIMAL(6, 2),          -- nullable for bodyweight-only exercises
  reps        INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_reps_positive CHECK (reps > 0),
  CONSTRAINT chk_weight_non_negative CHECK (weight_kg IS NULL OR weight_kg >= 0)
);

CREATE INDEX idx_exercise_sets_session ON exercise_sets(session_id);
CREATE INDEX idx_exercise_sets_exercise ON exercise_sets(exercise_id);
CREATE INDEX idx_exercise_sets_session_exercise ON exercise_sets(session_id, exercise_id);

-- -----------------------------------------------------------------------------
-- Optional: updated_at trigger for users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
