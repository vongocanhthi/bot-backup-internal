ALTER TABLE characters ADD COLUMN voice_name text;
ALTER TABLE characters ADD COLUMN voice_provider text;
ALTER TABLE characters ADD COLUMN voice_gender text;
ALTER TABLE characters ADD COLUMN voice_age text;
ALTER TABLE characters ADD COLUMN voice_accent text;
ALTER TABLE characters ADD COLUMN voice_speed text;
ALTER TABLE characters ADD COLUMN voice_pitch text;
ALTER TABLE characters ADD COLUMN voice_style text;
ALTER TABLE characters ADD COLUMN voice_sample_line text;

CREATE TABLE character_voice_samples (
  character_id uuid PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  audio bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
