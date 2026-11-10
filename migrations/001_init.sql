CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE login_attempts (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  ip text NOT NULL,
  success boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_attempts_email_idx ON login_attempts (email, attempted_at);
CREATE INDEX login_attempts_ip_idx ON login_attempts (ip, attempted_at);

CREATE TABLE bots (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE channels (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  platform text,
  posting_service text,
  connection_label text,
  external_id text,
  platform_external_id text,
  external_url text,
  org_id text,
  notes text,
  bot_id text REFERENCES bots(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE weekly_slots (
  id uuid PRIMARY KEY,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  weekday smallint,
  time_local text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_slots_weekday_chk CHECK (weekday IS NULL OR (weekday >= 1 AND weekday <= 7))
);

CREATE INDEX weekly_slots_channel_idx ON weekly_slots (channel_id);

CREATE TABLE snapshots (
  id uuid PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  label text,
  imported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  imported_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY,
  snapshot_id uuid NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  channel_code text,
  channel_id uuid REFERENCES channels(id) ON DELETE SET NULL,
  external_id text,
  title text,
  body text,
  status text,
  scheduled_at timestamptz,
  published_at timestamptz,
  platform text,
  service text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_snapshot_idx ON posts (snapshot_id);
CREATE INDEX posts_scheduled_idx ON posts (scheduled_at);

CREATE TABLE import_tokens (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  revoked boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE characters (
  id uuid PRIMARY KEY,
  bot_id text NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name text NOT NULL,
  appearance text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX characters_bot_idx ON characters (bot_id, sort_order);

CREATE TABLE character_images (
  id uuid PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_images_kind_chk CHECK (kind IN ('front', 'full_body', 'expression', 'other'))
);

CREATE INDEX character_images_character_idx ON character_images (character_id);
