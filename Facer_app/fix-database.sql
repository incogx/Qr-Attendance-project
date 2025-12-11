-- Quick fix for students table - Run this in Supabase SQL Editor
-- This ensures the reg_number column exists

-- Add reg_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'reg_number'
  ) THEN
    -- Add the column as nullable first
    ALTER TABLE students ADD COLUMN reg_number text;
    
    -- Copy roll_number to reg_number for existing records
    UPDATE students SET reg_number = roll_number WHERE reg_number IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE students ALTER COLUMN reg_number SET NOT NULL;
    
    -- Add unique constraint
    ALTER TABLE students ADD CONSTRAINT students_reg_number_unique UNIQUE (reg_number);
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_students_reg_number ON students(reg_number);
  END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position;

