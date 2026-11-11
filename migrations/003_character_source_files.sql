CREATE TABLE character_source_files (
  id uuid PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  data bytea NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, filename)
);

CREATE INDEX character_source_files_character_idx ON character_source_files (character_id, created_at);
