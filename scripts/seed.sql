-- Demo database seed for SQL AI Assistant
-- Run with: psql -U postgres -d postgres -f scripts/seed.sql

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  total NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (email, name, created_at) VALUES
  ('alice@example.com', 'Alice Johnson', NOW() - INTERVAL '60 days'),
  ('bob@example.com', 'Bob Smith', NOW() - INTERVAL '45 days'),
  ('carol@example.com', 'Carol White', NOW() - INTERVAL '30 days'),
  ('dave@example.com', 'Dave Brown', NOW() - INTERVAL '10 days'),
  ('eve@example.com', 'Eve Davis', NOW() - INTERVAL '5 days');

INSERT INTO orders (user_id, total, status, created_at)
SELECT u.id,
  (random() * 200 + 10)::NUMERIC(10,2),
  (ARRAY['pending','completed','cancelled'])[floor(random()*3+1)::int],
  NOW() - (random() * 40 || ' days')::INTERVAL
FROM users u, generate_series(1, 4);
