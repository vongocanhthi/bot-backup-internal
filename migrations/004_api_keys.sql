-- bots.id is text, so the optional restriction references that column rather than a uuid.
ALTER TABLE bots ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'backup',
  bot_id text REFERENCES bots(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX api_keys_bot_idx ON api_keys (bot_id);
