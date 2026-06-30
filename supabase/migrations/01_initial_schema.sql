-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'faculty', 'student');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Students table
CREATE TABLE students (
    profile_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reg_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    current_level INT NOT NULL,
    enrollment_year INT NOT NULL
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credit_units INT NOT NULL
);

-- Results table
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(profile_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    ca_score NUMERIC CHECK (ca_score >= 0 AND ca_score <= 30),
    exam_score NUMERIC CHECK (exam_score >= 0 AND exam_score <= 70),
    total_score NUMERIC GENERATED ALWAYS AS (ca_score + exam_score) STORED,
    letter_grade CHAR(1),
    grade_point NUMERIC,
    academic_year TEXT NOT NULL,
    semester INT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a function to auto-update modified_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.modified_at = now(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_results_modtime
BEFORE UPDATE ON results
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
