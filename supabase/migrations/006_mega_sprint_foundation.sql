-- 006_mega_sprint_foundation.sql

-- 1. Create RAG Storage (Vector DB)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE student_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT,
    content TEXT,
    embedding VECTOR(1536) -- For OpenAI/equivalent embeddings
);

-- 2. Audit Logging System (Cyber Security/Data Engineer)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT,
    action TEXT,
    user_id UUID,
    row_id UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to log changes on sensitive tables
CREATE OR REPLACE FUNCTION fn_audit_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, action, user_id, row_id)
    VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), OLD.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_submissions
AFTER UPDATE OR DELETE ON attendance_submissions
FOR EACH ROW EXECUTE FUNCTION fn_audit_change();
