-- Batch B Migration: Enable Vector and RAG Foundation

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table for storing embeddings (if applicable)
-- For attendance analytics, we might embed session summaries or student notes
CREATE TABLE IF NOT EXISTS attendance_embeddings (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536), -- Standard size for OpenAI embeddings
  metadata JSONB
);

-- 3. Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_attendance_embeddings_embedding ON attendance_embeddings USING ivfflat (embedding vector_cosine_ops);
