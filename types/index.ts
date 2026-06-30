export type UserRole = 'hod' | 'course_advisor' | 'lecturer' | 'student';
export type AdvisorLevel = 100 | 200 | 300 | 400 | 500;

export type FutoSchool = 'SICT' | 'SEET' | 'SOES' | 'SOHT' | 'SAAT' | 'SMAT';
export type FutoSemester = 'Harmattan' | 'Rain';
export type ResultStatus = 'draft' | 'released';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  school?: FutoSchool;
  department?: string;
  assigned_courses?: string[]; // Array of course codes for lecturers
  advisor_level?: number;       // For course_advisor: the single level they manage (e.g. 400)
  created_at: string;
}

export interface Student {
  profile_id: string;
  reg_number: string;
  full_name: string;
  department: string;
  current_level: number;
  enrollment_year: number;
  sex?: 'Male' | 'Female';
  phone_number?: string;
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  credit_units: number;
  school: FutoSchool;
  department: string;
  level: number;
  semester: FutoSemester;
}

export interface Result {
  id: string;
  student_id: string;
  course_id: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number;
  letter_grade: string | null;
  grade_point: number | null;
  academic_year: string;
  semester: FutoSemester;
  uploaded_by: string;
  modified_at: string;
  status: ResultStatus;
}
