-- Run this in Supabase SQL Editor (safe to re-run)

-- 1. measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  reliability INTEGER NOT NULL,
  latency INTEGER,
  jitter INTEGER,
  packet_loss DOUBLE PRECISION,
  neighborhood TEXT,
  city TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS measurements_timestamp_idx ON measurements (timestamp DESC);

-- 2. cdn_probes table (with measurement_id link)
CREATE TABLE IF NOT EXISTS cdn_probes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  measurement_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  neighborhood TEXT,
  city TEXT,
  timestamp BIGINT NOT NULL,
  results JSONB NOT NULL,
  best_cdn TEXT,
  worst_cdn TEXT,
  avg_latency INTEGER,
  dead_zone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cdn_probes_timestamp_idx ON cdn_probes (timestamp DESC);
CREATE INDEX IF NOT EXISTS cdn_probes_measurement_id_idx ON cdn_probes (measurement_id);

-- 3. RLS
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdn_probes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read measurements" ON measurements FOR SELECT USING (true);
CREATE POLICY "Public insert measurements" ON measurements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read cdn_probes" ON cdn_probes FOR SELECT USING (true);
CREATE POLICY "Public insert cdn_probes" ON cdn_probes FOR INSERT WITH CHECK (true);
