-- Add new columns to message table for photo sharing feature
ALTER TABLE message ADD COLUMN messageType VARCHAR(20) DEFAULT 'TEXT';
ALTER TABLE message ADD COLUMN imageData TEXT;

-- Verify the changes
DESCRIBE message;