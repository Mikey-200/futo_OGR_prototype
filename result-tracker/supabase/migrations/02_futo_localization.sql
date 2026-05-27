-- 1. Wipe out any existing data to clear the NOT NULL constraint conflict
TRUNCATE TABLE public.results CASCADE;
TRUNCATE TABLE public.courses CASCADE;

-- 2. Create custom enums for FUTO Semester terms if they don't exist yet
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'futo_semester') THEN
        CREATE TYPE futo_semester AS ENUM ('Harmattan', 'Rain');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'futo_school') THEN
        CREATE TYPE futo_school AS ENUM ('SICT', 'SEET', 'SOES', 'SOHT', 'SAAT', 'SMAT');
    END IF;
END $$;

-- 3. Modify the Courses table to inject FUTO localized columns smoothly
ALTER TABLE public.courses 
ADD COLUMN school futo_school NOT NULL DEFAULT 'SICT',
ADD COLUMN department TEXT NOT NULL DEFAULT 'IFT', -- Set a default to satisfy existing schema states
ADD COLUMN level INT NOT NULL DEFAULT 100 CHECK (level BETWEEN 100 AND 500),
ADD COLUMN semester futo_semester NOT NULL DEFAULT 'Harmattan';

-- 4. Clean up the default flags so future entries require explicit declarations
ALTER TABLE public.courses ALTER COLUMN department DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN level DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN semester DROP DEFAULT;

-- 5. Ensure the results mapping table expects FUTO localized semesters
ALTER TABLE public.results DROP COLUMN IF EXISTS semester;
ALTER TABLE public.results ADD COLUMN semester futo_semester NOT NULL;