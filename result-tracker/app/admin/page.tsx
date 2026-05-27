import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { calculateCGPA } from "@/lib/gradingEngine";
import PrintButton from "@/components/PrintButton";
import AdminFilterBar from "@/components/AdminFilterBar";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  
  // 1. Session & Role Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin' && userData?.role !== 'dean') redirect('/login?error=unauthorized');

  // Parse FUTO Coordinates
  const school = (params.school as string) || 'SICT';
  const dept = (params.dept as string);
  const level = parseInt((params.level as string) || '500', 10);
  const semester = (params.semester as string) || 'Harmattan';

  // Render Overview Dashboard if no department is specifically queried
  if (!dept) {
    const departments = [
      { id: 'IFT', name: 'DEPARTMENT OF INFORMATION TECHNOLOGY', enrolled: 125, courses: 40 },
      { id: 'CSC', name: 'DEPARTMENT OF COMPUTER SCIENCE', enrolled: 125, courses: 40 },
      { id: 'CYB', name: 'DEPARTMENT OF CYBERSECURITY', enrolled: 125, courses: 40 },
      { id: 'SOE', name: 'DEPARTMENT OF SOFTWARE ENGINEERING', enrolled: 125, courses: 40 }
    ];

    return (
      <div className="min-h-screen p-4 md:p-8 bg-[#f8fafc]">
        <div className="max-w-[1400px] mx-auto">
          <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">SICT Executive Overview</h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">School of Information and Communication Technology</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map(d => (
              <div key={d.id} className="bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 p-6 rounded-xl flex flex-col justify-between hover:shadow-xl hover:border-slate-300 transition-all duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{d.name}</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                   <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Enrollment</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{d.enrolled} Active Students</span>
                   </div>
                   <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Curriculum Load</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{d.courses} Active Courses</span>
                   </div>
                   <div className="flex flex-col space-y-1 col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Session</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">2025/2026 Ledger</span>
                   </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.9)]"></div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ledger Status: 100% Released</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch Matching Courses for exact coordinate
  const { data: targetCourses, error: coursesError } = await supabase
    .from('courses')
    .select('id, course_code, title, credit_units')
    .eq('school', school)
    .eq('department', dept)
    .eq('level', level)
    .eq('semester', semester);

  if (coursesError) {
    console.error("Courses fetch error:", coursesError);
    return <div className="p-8 text-rose-600 font-medium bg-rose-50 rounded-lg m-8">System Failure: Unable to fetch course directory.</div>;
  }

  const courseMap = new Map();
  targetCourses?.forEach(c => courseMap.set(c.id, c));
  const courseIds = targetCourses?.map(c => c.id) || [];

  let resultsData: any[] = [];
  
  if (courseIds.length > 0) {
    // 3. Fetch Master Data
    const { data: fetchedResults, error: resultsError } = await supabase
      .from('results')
      .select(`
        *,
        students!inner ( profile_id, reg_number, full_name, department, current_level )
      `)
      .in('course_id', courseIds);
      
    if (resultsError) {
      console.error("Results fetch error:", resultsError);
      return <div className="p-8 text-rose-600 font-medium bg-rose-50 rounded-lg m-8">System Failure: Unable to compile result matrix.</div>;
    }
    resultsData = fetchedResults || [];
  }

  // 4. Process Data into Matrix
  const studentsMap = new Map();
  const allCourses = new Set<string>();

  targetCourses?.forEach(c => allCourses.add(c.course_code));

  resultsData.forEach(row => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const course = courseMap.get(row.course_id);
    
    if (!student || !course) return;

    if (!studentsMap.has(student.profile_id)) {
      studentsMap.set(student.profile_id, {
        info: student,
        results: {},
        courseResultsForGPA: []
      });
    }

    const s = studentsMap.get(student.profile_id);
    s.results[course.course_code] = {
      total_score: row.total_score,
      letter_grade: row.letter_grade
    };
    
    s.courseResultsForGPA.push({
      creditUnits: course.credit_units,
      totalScore: row.total_score
    });
  });

  const sortedCourses = Array.from(allCourses).sort();
  const studentRows = Array.from(studentsMap.values()).map(s => ({
    ...s,
    cgpa: calculateCGPA(s.courseResultsForGPA)
  })).sort((a, b) => a.info.reg_number.localeCompare(b.info.reg_number));

  const getBadgeStyles = (grade: string) => {
    if (grade === 'A' || grade === 'B') return "bg-[#e6f2eb] text-[#0d5c2e] border border-[#0d5c2e]/20";
    if (grade === 'C' || grade === 'D') return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-rose-100 text-rose-800 border border-rose-200";
  };

  const deptNames: Record<string, string> = {
    'IFT': 'INFORMATION TECHNOLOGY',
    'CSC': 'COMPUTER SCIENCE',
    'CYB': 'CYBERSECURITY',
    'SE': 'SOFTWARE ENGINEERING',
    'SOE': 'SOFTWARE ENGINEERING',
    'EEE': 'ELECTRICAL AND ELECTRONICS ENGINEERING'
  };
  const longDeptName = deptNames[dept] || dept;

  return (
    <div className="min-h-screen p-8 print:p-0 print:bg-white bg-[#f8fafc]">
      <div className="max-w-[1400px] mx-auto">
        <header className="mb-6 flex justify-between items-end print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Master OGR Directory</h1>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2">FUTO Departmental Overall Grade Record Matrix</p>
          </div>
          <PrintButton />
        </header>
        
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black uppercase text-slate-900">DEPARTMENT OF {longDeptName}</h1>
          <h2 className="text-lg font-bold text-slate-800">OVERALL GRADE RECORD (OGR)</h2>
          <p className="text-sm font-semibold text-slate-600 mt-1">{level} LEVEL | {semester.toUpperCase()} SEMESTER</p>
        </div>

        <AdminFilterBar />

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto print:border-none print:shadow-none print:bg-white relative">
          <table className="min-w-max print:text-xs border-collapse w-full">
            <thead className="bg-slate-50 border-b border-slate-200 print:bg-transparent">
              <tr>
                <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 sticky left-0 z-20 w-[60px] min-w-[60px] bg-slate-50 print:static print:bg-transparent print:border print:px-2 print:py-2 print:text-slate-900">
                  S/N
                </th>
                <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 sticky left-[60px] z-20 w-[140px] min-w-[140px] bg-slate-50 border-l border-slate-200 print:static print:bg-transparent print:border print:px-2 print:py-2 print:text-slate-900">
                  Reg Number
                </th>
                <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 sticky left-[200px] z-20 w-[220px] min-w-[220px] bg-slate-50 border-l border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.03)] print:static print:bg-transparent print:border print:px-2 print:py-2 print:text-slate-900 print:shadow-none">
                  Full Name
                </th>
                {sortedCourses.map(c => (
                  <th key={c} className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200 print:border print:px-2 print:py-2 print:text-slate-900">
                    {c}
                  </th>
                ))}
                <th className="px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-[#0d5c2e] print:border print:px-2 print:py-2 print:text-slate-900">
                  CGPA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {studentRows.length === 0 && (
                <tr>
                  <td colSpan={sortedCourses.length + 4} className="px-4 py-16 text-center text-slate-500 font-medium">
                    {courseIds.length === 0 
                      ? "No registered courses found for these coordinates."
                      : "No computational matrix available."}
                  </td>
                </tr>
              )}
              {studentRows.map((row, index) => (
                <tr key={row.info.profile_id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-500 sticky left-0 z-10 w-[60px] min-w-[60px] bg-white group-hover:bg-slate-50/80 transition-colors print:static print:bg-transparent print:text-slate-900 print:border print:px-2 print:py-1">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-900 sticky left-[60px] z-10 w-[140px] min-w-[140px] bg-white border-l border-slate-100 group-hover:bg-slate-50/80 group-hover:border-slate-200 transition-colors print:static print:bg-transparent print:text-slate-900 print:border print:px-2 print:py-1">
                    {row.info.reg_number}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 sticky left-[200px] z-10 w-[220px] min-w-[220px] bg-white border-l border-r border-slate-100 shadow-[4px_0_10px_rgba(0,0,0,0.02)] group-hover:bg-slate-50/80 group-hover:border-slate-200 transition-colors print:static print:bg-transparent print:text-slate-800 print:border print:px-2 print:py-1 print:shadow-none truncate">
                    {row.info.full_name}
                  </td>
                  {sortedCourses.map(c => {
                    const res = row.results[c];
                    return (
                      <td key={c} className="px-4 py-3 whitespace-nowrap text-center text-sm border-r border-slate-100 group-hover:border-slate-200 print:border print:px-2 print:py-1">
                        {res ? (
                          <div className="flex items-center justify-center space-x-2 print:space-x-1">
                            <span className="font-bold text-slate-900 print:text-slate-900">{res.total_score}</span>
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getBadgeStyles(res.letter_grade)} print:bg-transparent print:text-slate-700 print:border-none print:p-0`}>
                              {res.letter_grade}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 print:text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-black text-[#0d5c2e] print:text-slate-900 print:border print:px-2 print:py-1">
                    {row.cgpa.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
