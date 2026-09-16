-- Optional performance indexes. Run once against production if your PostgreSQL
-- has the pg_trgm extension available:
--
--   psql "$DATABASE_URL" -f prisma/sql/optional-trigram-indexes.sql
--
-- They make the "contains" filters behind admin search noticeably faster on
-- large tables. The application works correctly without them.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING GIN ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "leads_name_trgm_idx" ON "leads" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "courses_title_trgm_idx" ON "courses" USING GIN ("title" gin_trgm_ops);
