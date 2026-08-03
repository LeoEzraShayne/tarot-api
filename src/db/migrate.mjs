import { pool } from './pool.mjs';
if(!pool){console.log('DATABASE_URL is not set; skipping migrations.');process.exit(0);}
const statements=[
`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, google_sub text UNIQUE NOT NULL, email text, name text, picture_url text, created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS auth_sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS readings (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL, anonymous_session_id uuid, question varchar(200) NOT NULL, spread_id text NOT NULL, seed text NOT NULL, state text NOT NULL, interpretation jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS reading_accuracy (reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, accuracy smallint NOT NULL CHECK (accuracy BETWEEN 1 AND 3), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(reading_id,user_id))`,
`CREATE TABLE IF NOT EXISTS reading_cards (reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE CASCADE, position_index integer NOT NULL, card_id text NOT NULL, orientation text NOT NULL CHECK (orientation IN ('upright','reversed')), evidence jsonb NOT NULL, PRIMARY KEY(reading_id,position_index))`,
`CREATE TABLE IF NOT EXISTS feedback (id uuid PRIMARY KEY, reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE SET NULL, helpful boolean, note text, created_at timestamptz NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS retrospective_reviews (id uuid PRIMARY KEY, reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id) ON DELETE SET NULL, review text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
`ALTER TABLE readings ADD COLUMN IF NOT EXISTS user_context text NOT NULL DEFAULT ''`,
`ALTER TABLE readings ADD COLUMN IF NOT EXISTS interpretations jsonb NOT NULL DEFAULT '{}'::jsonb`
];
for(const sql of statements)await pool.query(sql);
await pool.end();console.log('Migrations complete.');
