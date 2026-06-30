/**
 * NUC 5-Point Grading System Computation Engine
 */

export type GradeResult = {
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  gradePoint: number;
};

/**
 * Calculates letter grade and grade point based on total score.
 * NUC Standard:
 * 70 - 100 = A (5 Grade Points)
 * 60 - 69  = B (4 Grade Points)
 * 50 - 59  = C (3 Grade Points)
 * 45 - 49  = D (2 Grade Points)
 * 0  - 44  = F (0 Grade Points)
 * 
 * @param totalScore The sum of CA and Exam scores
 * @returns GradeResult object
 */
export function calculateGrade(totalScore: number): GradeResult {
  if (totalScore >= 70 && totalScore <= 100) return { letterGrade: 'A', gradePoint: 5 };
  if (totalScore >= 60 && totalScore <= 69) return { letterGrade: 'B', gradePoint: 4 };
  if (totalScore >= 50 && totalScore <= 59) return { letterGrade: 'C', gradePoint: 3 };
  if (totalScore >= 45 && totalScore <= 49) return { letterGrade: 'D', gradePoint: 2 };
  return { letterGrade: 'F', gradePoint: 0 };
}

export type CourseResult = {
  creditUnits: number;
  totalScore: number;
};

/**
 * Computes GPA for a given semester's results.
 * Formula: Sum of (Course Credit Units * Achieved Grade Points) / Total Course Credit Units Registered
 * 
 * @param courses Array of course results
 * @returns Computed GPA
 */
export function calculateGPA(courses: CourseResult[]): number {
  if (courses.length === 0) return 0;

  let totalCreditUnits = 0;
  let totalGradePoints = 0;

  for (const course of courses) {
    const { gradePoint } = calculateGrade(course.totalScore);
    totalCreditUnits += course.creditUnits;
    totalGradePoints += (course.creditUnits * gradePoint);
  }

  if (totalCreditUnits === 0) return 0;
  return Number((totalGradePoints / totalCreditUnits).toFixed(2));
}

/**
 * Computes Cumulative GPA (CGPA) dynamically from all semester courses.
 * 
 * @param allCourses Array of all course results across semesters
 * @returns Computed CGPA
 */
export function calculateCGPA(allCourses: CourseResult[]): number {
  return calculateGPA(allCourses);
}
