import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { calculateGPA, calculateCGPA } from "@/lib/gradingEngine";
import CGPAChart from "@/components/CGPAChart";

export default async function StudentDashboard() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'student') redirect('/login?error=unauthorized');

  const { data: studentProfile } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  const { data: resultsData, error } = await supabase
    .from('results')
    .select(`
      *,
      courses!inner ( id, course_code, title, credit_units )
    `)
    .eq('student_id', user.id)
    .order('academic_year', { ascending: true })
    .order('semester', { ascending: true });

  if (error) {
    return <div className="p-8 text-rose-600 bg-rose-50 m-8 rounded-lg font-medium">Failed to load academic records.</div>;
  }

  const sessionsMap = new Map();
  const allCourseResults: { creditUnits: number; totalScore: number }[] = [];
  
  let totalCreditsRegistered = 0;

  resultsData?.forEach(row => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    if (!course) return;

    totalCreditsRegistered += course.credit_units;
    
    const year = row.academic_year;
    if (!sessionsMap.has(year)) {
      sessionsMap.set(year, {
        academic_year: year,
        semesters: {
          Harmattan: { courses: [], courseResultsForGPA: [], gpa: 0, cgpa: 0 },
          Rain: { courses: [], courseResultsForGPA: [], gpa: 0, cgpa: 0 }
        }
      });
    }

    const session = sessionsMap.get(year);
    const sem = session.semesters[row.semester as 'Harmattan' | 'Rain'];
    
    sem.courses.push({
      ...row,
      course_code: course.course_code,
      title: course.title,
      credit_units: course.credit_units
    });
    
    const resultItem = {
      creditUnits: course.credit_units,
      totalScore: row.total_score
    };
    sem.courseResultsForGPA.push(resultItem);
    allCourseResults.push(resultItem);
  });

  const currentCGPA = calculateCGPA(allCourseResults);
  const academicStanding = currentCGPA >= 1.5 ? "Good Standing" : "Academic Warning";

  const sessionArray = Array.from(sessionsMap.values());
  const chartData: { name: string; gpa: number; cgpa: number }[] = [];
  const runningResults: { creditUnits: number; totalScore: number }[] = [];

  for (const session of sessionArray) {
    for (const semKey of ['Harmattan', 'Rain'] as const) {
      const sem = session.semesters[semKey];
      if (sem.courses.length === 0) continue;

      runningResults.push(...sem.courseResultsForGPA);
      const semGPA = calculateGPA(sem.courseResultsForGPA);
      const runCGPA = calculateCGPA(runningResults);
      
      chartData.push({
        name: `${session.academic_year} ${semKey.charAt(0)}`,
        gpa: semGPA,
        cgpa: runCGPA
      });
      
      sem.gpa = semGPA;
      sem.cgpa = runCGPA;
    }
  }

  sessionArray.reverse();

  const getBadgeStyles = (grade: string) => {
    if (grade === 'A' || grade === 'B') return "bg-[#e6f2eb] text-[#0d5c2e] border border-[#0d5c2e]/20";
    if (grade === 'C' || grade === 'D') return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-rose-100 text-rose-800 border border-rose-200";
  };

  const MAX_CREDITS = 120; // Example graduation milestone
  const creditPercentage = Math.min((totalCreditsRegistered / MAX_CREDITS) * 100, 100);

  return (
    <div className="min-h-screen p-8 bg-[#f8fafc]">
      <div className="max-w-[1200px] mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome, {studentProfile?.full_name || 'Student'}</h1>
          <div className="flex items-center space-x-4 mt-3">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500">
              Reg No: <span className="text-slate-900">{studentProfile?.reg_number}</span>
            </span>
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500">
              Level: <span className="text-slate-900">{studentProfile?.current_level}</span>
            </span>
          </div>
        </header>

        {/* Bento Grid Summary Metrics */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Panel 1: CGPA */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col justify-between h-[200px]">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Current CGPA</h2>
              <div className="flex items-end space-x-3">
                <p className="text-5xl font-black tracking-tight text-[#0d5c2e]">{currentCGPA.toFixed(2)}</p>
                {currentCGPA >= 3.50 && (
                  <span className="mb-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#e6f2eb] text-[#0d5c2e] border border-[#0d5c2e]/20">
                    High Honor
                  </span>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Class: <span className="text-slate-700">{
                currentCGPA >= 4.5 ? "First Class" :
                currentCGPA >= 3.5 ? "Second Class Upper" :
                currentCGPA >= 2.4 ? "Second Class Lower" :
                currentCGPA >= 1.5 ? "Third Class" : "Fail"
              }</span></p>
            </div>
          </div>
          
          {/* Panel 2: Credit Accumulation */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-[200px]">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Credit Accumulation</h2>
              <p className="text-5xl font-black tracking-tight text-slate-900">
                {totalCreditsRegistered} <span className="text-2xl text-slate-400 font-bold">/ {MAX_CREDITS}</span>
              </p>
            </div>
            <div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden border border-slate-200">
                <div className="bg-[#0d5c2e] h-2 rounded-full transition-all duration-1000" style={{ width: `${creditPercentage}%` }}></div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">{creditPercentage.toFixed(1)}% of Milestone</p>
            </div>
          </div>

          {/* Panel 3: Academic Standing */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-[200px]">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Academic Standing</h2>
              <p className={`text-3xl font-black tracking-tight mt-2 ${currentCGPA >= 1.5 ? 'text-[#0d5c2e]' : 'text-rose-600'}`}>
                {academicStanding}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">NUC 5.0 Evaluation standard</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Timeline Section (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Academic Trajectory Matrix</h2>
            
            {sessionArray.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">No computational records instantiated.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {sessionArray.map((session) => (
                  <div key={session.academic_year} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                      <h3 className="text-lg font-black text-slate-900">{session.academic_year} Academic Session</h3>
                    </div>
                    
                    <div className="p-8 space-y-10">
                      {(['Harmattan', 'Rain'] as const).map((semKey) => {
                        const sem = session.semesters[semKey];
                        if (sem.courses.length === 0) return null;
                        
                        return (
                          <div key={semKey}>
                            <div className="flex flex-wrap justify-between items-end mb-4 border-b border-slate-100 pb-3">
                              <h4 className="text-slate-600 font-bold uppercase tracking-wider text-xs">{semKey} Semester Results</h4>
                              <div className="flex space-x-6">
                                <div className="text-right">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Semester GPA</p>
                                  <p className="font-black text-slate-900 text-lg">{sem.gpa.toFixed(2)}</p>
                                </div>
                                <div className="text-right border-l border-slate-200 pl-6">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-[#0d5c2e]">Running CGPA</p>
                                  <p className="font-black text-[#0d5c2e] text-lg">{sem.cgpa.toFixed(2)}</p>
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 overflow-hidden">
      
      {/* Section 1: Parameter Controls (25%) */}
      <div className="h-[25%] bg-white border-b border-slate-200 p-6 flex flex-col justify-between shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Academic Ledger</h2>
          <div className="mt-2 text-sm font-semibold text-slate-700">
            <span className="font-bold text-[#0d5c2e]">{studentInfo.name}</span> &mdash; <span className="font-mono text-slate-500">{studentInfo.reg_number}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <select value={level} onChange={e => setLevel(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e]">
            <option value="100L">100L</option>
            <option value="200L">200L</option>
            <option value="300L">300L</option>
            <option value="400L">400L</option>
            <option value="500L">500L</option>
          </select>
          
          <select value={semester} onChange={e => setSemester(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e]">
            <option value="Harmattan">Harmattan</option>
            <option value="Rain">Rain</option>
          </select>
          
          <select value={session} onChange={e => setSession(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e]">
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </select>
        </div>
      </div>

      {/* Section 2: Spreadsheet Data Grid or Privacy Gate (60%) */}
      <div className="h-[60%] overflow-auto bg-slate-50 border-b border-slate-200 print:h-auto relative">
        
        {!isReleased ? (
          // Privacy Gate Placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Results Not Available Yet</h3>
            <p className="text-slate-500 font-medium max-w-md leading-relaxed">
              This ledger is awaiting examination board release verification. Complete grades for this parameter block have not been officially published.
            </p>
          </div>
        ) : (
          // Authorized Grade Sheet
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Courses</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-24">CA</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-24">Exam</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Total</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Grade</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Grade Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {mockCourses.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.course}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{row.ca}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{row.exam}</td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">{row.total}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${
                      row.grade === 'A' || row.grade === 'B' ? 'bg-[#e6f2eb] text-[#0d5c2e]' : 
                      row.grade === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{row.grade_point?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* Section 3: Action Toolbar (15%) */}
      <div className="h-[15%] bg-white border-t border-slate-200 p-6 flex items-center justify-start shrink-0 print:hidden">
        <button 
          onClick={handlePrint} 
          disabled={!isReleased}
          className="flex items-center space-x-2 px-6 py-3 bg-[#f0f9f4] text-[#0d5c2e] font-bold text-sm rounded-lg hover:bg-[#e6f2eb] border border-[#0d5c2e]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-5 h-5" />
          <span>Print Official Ledger</span>
        </button>
      </div>

    </div>
  );
}
