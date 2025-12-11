# Database Setup Instructions

## Quick Fix for "column students.reg_number does not exist" Error

If you're seeing the error `column students.reg_number does not exist`, follow these steps:

### Option 1: Run the Fix Script (Recommended)

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `fix-database.sql`
4. Click **Run** to execute the script

This will:
- Add the `reg_number` column if it doesn't exist
- Copy existing `roll_number` values to `reg_number` for existing records
- Set up proper constraints and indexes

### Option 2: Run the Migration

If you're using Supabase migrations:

1. Make sure you have the Supabase CLI installed
2. Run: `supabase db push`
3. Or manually run the migration file: `supabase/migrations/20251210000001_fix_students_schema.sql`

### Option 3: Manual SQL Fix

Run this SQL directly in Supabase SQL Editor:

```sql
-- Add reg_number column
ALTER TABLE students ADD COLUMN IF NOT EXISTS reg_number text;

-- Copy roll_number to reg_number for existing records
UPDATE students SET reg_number = roll_number WHERE reg_number IS NULL;

-- Make it NOT NULL
ALTER TABLE students ALTER COLUMN reg_number SET NOT NULL;

-- Add unique constraint
ALTER TABLE students ADD CONSTRAINT students_reg_number_unique UNIQUE (reg_number);

-- Create index
CREATE INDEX IF NOT EXISTS idx_students_reg_number ON students(reg_number);
```

## Complete Database Schema

The `students` table should have these columns:

- `id` (uuid, primary key) - Links to auth.users
- `email` (text, unique, not null) - Student email
- `name` (text, not null) - Full name
- `roll_number` (text, unique, not null) - Student roll number
- `reg_number` (text, unique, not null) - Registration number (used for login)
- `face_encoding` (text, nullable) - Face recognition data
- `created_at` (timestamptz) - Record creation time

## Verify the Fix

After running the fix, verify the column exists:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see `reg_number` in the list.

## Setting Up Demo Data

1. First, create a test user in Supabase Auth Dashboard:
   - Email: `student@sathyabama.ac.in`
   - Password: `password123`

2. Get the user ID from `auth.users` table

3. Run the setup script (`setup-demo-data.sql`) with your user ID

4. Make sure to include both `roll_number` and `reg_number` when inserting students

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- This means `reg_number` already exists for some records
- Run: `UPDATE students SET reg_number = roll_number WHERE reg_number IS NULL;`

### Error: "column reg_number contains null values"
- Run: `UPDATE students SET reg_number = roll_number WHERE reg_number IS NULL;`
- Then: `ALTER TABLE students ALTER COLUMN reg_number SET NOT NULL;`

### Still seeing errors?
- Check that the migration has run successfully
- Verify the column exists using the verification query above
- Make sure your Supabase project is properly connected

