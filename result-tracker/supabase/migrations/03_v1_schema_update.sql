-- V1 Schema Update for Strict Roles and Result Privacy

-- Update the user roles constraint if it exists (assuming a check constraint or we just add columns)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS school text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS assigned_courses text[];

-- The app now expects roles: 'dean', 'hod', 'lecturer', 'student'
-- Existing 'admin' -> 'hod' or 'dean'
-- Existing 'faculty' -> 'lecturer'
UPDATE users SET role = 'hod' WHERE role = 'admin';
UPDATE users SET role = 'lecturer' WHERE role = 'faculty';

-- Add status column to results table to enforce Student Privacy Gate
ALTER TABLE results
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'released'));

-- Update existing results to released so they don't break immediately in the new UI
UPDATE results SET status = 'released';

-- Add gender and phone to students for roster management
ALTER TABLE students
ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('Male', 'Female')),
ADD COLUMN IF NOT EXISTS phone_number varchar(11);
