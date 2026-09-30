-- Utilizadores locais no lugar de auth.users do Supabase.
-- auth.uid() lê o id definido pela aplicação em cada transação.

CREATE ROLE authenticated NOLOGIN;

CREATE ROLE persoo_app
  LOGIN
  PASSWORD 'persoo_app'
  NOSUPERUSER
  NOBYPASSRLS
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT;

GRANT authenticated TO persoo_app;
GRANT CONNECT ON DATABASE persoo TO persoo_app;
GRANT USAGE ON SCHEMA public TO persoo_app;
GRANT USAGE ON SCHEMA public TO authenticated;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
