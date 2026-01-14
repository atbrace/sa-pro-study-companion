-- Add lab context to tutor conversations
ALTER TABLE tutor_conversations ADD COLUMN context_lab_id TEXT;

-- Add index for lab context
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_lab ON tutor_conversations(context_lab_id);
