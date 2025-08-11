/*
  # School Attendance Management System Database Schema

  1. New Tables
    - `classes`
      - `id` (uuid, primary key)
      - `class_name` (text, required)
      - `grade` (integer, required)
      - `created_at` (timestamp)
    - `students`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `class_id` (uuid, foreign key → classes.id)
      - `gender` (text, enum: 'Male', 'Female')
      - `date_of_birth` (date)
      - `created_at` (timestamp)
    - `attendance`
      - `id` (uuid, primary key)
      - `student_id` (uuid, foreign key → students.id)
      - `date` (date, required)
      - `status` (text, enum: 'Present', 'Absent', 'Late', 'Excused')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage data
    - Create indexes for performance optimization

  3. Data Integrity
    - Foreign key constraints
    - Check constraints for enums
    - Unique constraints where appropriate
*/

-- Create custom types for enums
CREATE TYPE gender_type AS ENUM ('Male', 'Female');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Excused');

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name text NOT NULL,
  grade integer NOT NULL CHECK (grade >= 1 AND grade <= 12),
  created_at timestamptz DEFAULT now()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  gender gender_type NOT NULL,
  date_of_birth date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'Present',
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable Row Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for classes
CREATE POLICY "Allow all operations on classes"
  ON classes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for students
CREATE POLICY "Allow all operations on students"
  ON students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for attendance
CREATE POLICY "Allow all operations on attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);

-- Insert sample data
INSERT INTO classes (class_name, grade) VALUES
  ('3A', 3),
  ('3B', 3),
  ('4A', 4),
  ('4B', 4)
ON CONFLICT DO NOTHING;

-- Get class IDs for sample students
DO $$
DECLARE
  class_3a_id uuid;
  class_3b_id uuid;
BEGIN
  SELECT id INTO class_3a_id FROM classes WHERE class_name = '3A' LIMIT 1;
  SELECT id INTO class_3b_id FROM classes WHERE class_name = '3B' LIMIT 1;
  
  -- Insert sample students
  INSERT INTO students (name, class_id, gender, date_of_birth) VALUES
    ('Emma Johnson', class_3a_id, 'Female', '2015-03-15'),
    ('Liam Smith', class_3a_id, 'Male', '2015-05-22'),
    ('Sophia Davis', class_3a_id, 'Female', '2015-01-08'),
    ('Noah Wilson', class_3a_id, 'Male', '2015-07-12'),
    ('Olivia Brown', class_3b_id, 'Female', '2015-04-18'),
    ('William Jones', class_3b_id, 'Male', '2015-09-03')
  ON CONFLICT DO NOTHING;
END $$;