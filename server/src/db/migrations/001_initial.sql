CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_normalized CHECK (email = LOWER(email))
);

CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE readings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  slot VARCHAR(20) NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT readings_valid_slot CHECK (slot IN ('fasting', 'after_breakfast', 'after_lunch', 'after_dinner')),
  CONSTRAINT readings_valid_value CHECK (value BETWEEN 40 AND 600),
  CONSTRAINT readings_user_date_slot_unique UNIQUE (user_id, reading_date, slot)
);
-- The unique index above also supports user/date range lookups.
