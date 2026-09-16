-- Full-text search vectors and audit-log immutability.
--
-- Prisma cannot express generated columns or triggers, so this migration is
-- written by hand. It is safe to re-run.

-- ───────────── Full-text search ─────────────
-- A generated tsvector per searchable table keeps search in PostgreSQL with no
-- extra service. Weights: A = title, B = subtitle/summary, C = body.

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("subtitle", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("shortDescription", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS "courses_search_idx" ON "courses" USING GIN ("search_vector");

ALTER TABLE "lessons"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS "lessons_search_idx" ON "lessons" USING GIN ("search_vector");

ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("excerpt", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("content", '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS "blog_posts_search_idx" ON "blog_posts" USING GIN ("search_vector");

ALTER TABLE "pages"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("seoDescription", '')), 'B')
  ) STORED;
CREATE INDEX IF NOT EXISTS "pages_search_idx" ON "pages" USING GIN ("search_vector");

ALTER TABLE "discussions"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("body", '')), 'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS "discussions_search_idx" ON "discussions" USING GIN ("search_vector");

-- Trigram indexes for fast "contains" search on names and emails are optional
-- and live in prisma/sql/optional-trigram-indexes.sql, because pg_trgm is not
-- available on every managed PostgreSQL plan.

-- ───────────── Audit-log immutability ─────────────
-- Audit rows may be inserted and read, never changed or removed. The trigger
-- blocks UPDATE and DELETE for every role, including the application role and
-- ordinary administrators. Deliberate retention pruning must be done by a
-- superuser after disabling the trigger, which is itself logged by PostgreSQL.

CREATE OR REPLACE FUNCTION "audit_logs_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "audit_logs_no_update" ON "audit_logs";
CREATE TRIGGER "audit_logs_no_update"
  BEFORE UPDATE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_immutable"();

DROP TRIGGER IF EXISTS "audit_logs_no_delete" ON "audit_logs";
CREATE TRIGGER "audit_logs_no_delete"
  BEFORE DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_immutable"();

-- Receipts and certificate verifications are records of fact too.
DROP TRIGGER IF EXISTS "receipts_no_update" ON "receipts";
CREATE TRIGGER "receipts_no_update"
  BEFORE UPDATE ON "receipts"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_immutable"();
