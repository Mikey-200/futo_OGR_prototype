"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, Download, Upload, Edit3, Save, Lock, Unlock, AlertTriangle, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export default function DepartmentResults() {
  const searchParams = useSearchParams();
  const rawDept = searchParams.get('dept') || 'Unknown';
  
  const [userRole, setUserRole] = useState<string>("student");
  const [userId, setUserId] = useState<string>("system");
  const dept = userRole === 'hod' ? 'IFT' : rawDept; // Scope HOD boundary access
  
  // Section 1: Parameter State
  const [level, setLevel] = useState("500L");
  const [semester, setSemester] = useState("Harmattan");
  const [session, setSession] = useState("2023/2024");
  
  // Dynamic Course State
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [courseCode, setCourseCode] = useState("");
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [uploadPrompt, setUploadPrompt] = useState(false);
  
  // Section 2: Grid State
  const [rows, setRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]); // Backup for reverting edits
  const [isGridLoading, setIsGridLoading] = useState(false);
  
  // Persistence & Validation State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Section 3: Auth Modal State
  const [authModal, setAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [isReleased, setIsReleased] = useState(false);

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (data) setUserRole(data.role);
      }
    };
    fetchUser();
  }, []);

  // Fetch dynamic courses based on parameters
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      const levelNum = parseInt(level.replace('L', ''));
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('department', dept)
        .eq('level', levelNum)
        .eq('semester', semester);
      
      if (!error && data && data.length > 0) {
        setAvailableCourses(data);
        setCourseCode(data[0].course_code);
      } else {
        setAvailableCourses([]);
        setCourseCode("");
      }
      setIsLoadingCourses(false);
    };

    fetchCourses();
  }, [dept, level, semester]);

  const hasNoCourses = availableCourses.length === 0 && !isLoadingCourses;

  // Fetch matrix rows (Students + their existing Results)
  useEffect(() => {
    const fetchMatrix = async () => {
      if (!courseCode || hasNoCourses) {
        setRows([]);
        setOriginalRows([]);
        return;
      }
      setIsGridLoading(true);
      
      const levelNum = parseInt(level.replace('L', ''));
      
      // 1. Fetch Students
      const { data: studentsData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('department', dept)
        .eq('current_level', levelNum)
        .order('full_name', { ascending: true });
        
      if (sErr || !studentsData) {
        setIsGridLoading(false);
        return;
      }
      
      // 2. Fetch Results
      const selectedCourse = availableCourses.find(c => c.course_code === courseCode);
      if (!selectedCourse) {
        setIsGridLoading(false);
        return;
      }

      const { data: resultsData } = await supabase
        .from('results')
        .select('*')
        .eq('course_id', selectedCourse.id)
        .eq('academic_year', session);
        
      // 3. Merge
      const mergedRows = studentsData.map(student => {
        const existingResult = resultsData?.find(r => r.student_id === student.profile_id);
        return {
          id: existingResult?.id || null, 
          student_id: student.profile_id,
          name: student.full_name,
          reg_number: student.reg_number,
          ca_score: existingResult?.ca_score || '', // empty string initially instead of 0 if missing
          exam_score: existingResult?.exam_score || '',
          total_score: existingResult?.total_score || 0,
          letter_grade: existingResult?.letter_grade || '-',
          grade_point: existingResult?.grade_point || 0,
          status: existingResult?.status || 'draft'
        };
      });
      
      setRows(mergedRows);
      setOriginalRows(JSON.parse(JSON.stringify(mergedRows))); // Deep clone for rollback buffer
      
      // Check if all rows are already released
      if (mergedRows.length > 0 && mergedRows.every(r => r.status === 'released')) {
        setIsReleased(true);
      } else {
        setIsReleased(false);
      }
      
      setIsGridLoading(false);
    };
    
    fetchMatrix();
  }, [dept, level, courseCode, session, availableCourses, hasNoCourses]);

  const isStaff = userRole !== 'student';
  // A row is fully graded if the total score is populated and it has a letter grade (not '-')
  const allRowsValid = rows.length > 0 && rows.every(r => r.letter_grade !== '-');

  const calculateGrade = (ca: number, exam: number) => {
    const total = Number(ca) + Number(exam);
    let grade = 'F';
    let point = 0.0;
    
    if (total >= 70) { grade = 'A'; point = 5.0; }
    else if (total >= 60) { grade = 'B'; point = 4.0; }
    else if (total >= 50) { grade = 'C'; point = 3.0; }
    else if (total >= 40) { grade = 'D'; point = 2.0; }
    else if (total >= 30) { grade = 'E'; point = 1.0; }

    return { total, grade, point };
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setIsError(true);
    setSaveSuccess(false);
    setTimeout(() => setIsError(false), 5000); // 5 sec timeout for error toast
  };

  const revertRow = (index: number) => {
    const backupRows = [...rows];
    backupRows[index] = JSON.parse(JSON.stringify(originalRows[index]));
    setRows(backupRows);
  };

  const saveRowToDB = async (row: any, newRows: any[], index: number) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsError(false);

    const selectedCourse = availableCourses.find(c => c.course_code === courseCode);
    if (!selectedCourse) {
      showError("System Error: No valid course context identified for sync.");
      setIsSaving(false);
      return;
    }

    const resultPayload = {
      student_id: row.student_id,
      course_id: selectedCourse.id,
      ca_score: row.ca_score === '' ? null : Number(row.ca_score),
      exam_score: row.exam_score === '' ? null : Number(row.exam_score),
      total_score: row.total_score,
      letter_grade: row.letter_grade,
      grade_point: row.grade_point,
      academic_year: session,
      semester: semester,
      status: row.status || 'draft',
      uploaded_by: userId
    };

    let error;
    if (row.id) {
        const res = await supabase.from('results').update(resultPayload).eq('id', row.id);
        error = res.error;
    } else {
        const res = await supabase.from('results').insert(resultPayload).select().single();
        if (!res.error && res.data) {
           newRows[index].id = res.data.id;
           setRows([...newRows]); // trigger update with ID
        }
        error = res.error;
    }

    if (!error) {
      // Sync successful: lock in the new backup original row buffer
      const newOriginals = [...originalRows];
      newOriginals[index] = JSON.parse(JSON.stringify(newRows[index]));
      setOriginalRows(newOriginals);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      console.error("Database Sync exception:", error);
      const errorMsg = error?.message || error?.details || "Unknown Database Synchronization Exception";
      showError(`Database Sync Error: ${errorMsg}`);
      revertRow(index);
    }
    
    setIsSaving(false);
  };

  const handleCellEdit = (index: number, field: string, value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleKeyDown = async (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      const row = rows[index];
      const ca = row.ca_score === '' ? 0 : Number(row.ca_score);
      const ex = row.exam_score === '' ? 0 : Number(row.exam_score);
      
      // 1. STRICT FRONTEND VALIDATION CHECKS
      if (ca > 40) {
        showError("Input Error: Class Assessment (CA) score cannot exceed the maximum limit of 40 points.");
        revertRow(index);
        return;
      }
      
      if (ex > 70) {
        showError("Input Error: Exam score cannot exceed the maximum limit of 70 points.");
        revertRow(index);
        return;
      }
      
      const { total, grade, point } = calculateGrade(ca, ex);
      
      if (total > 100) {
        showError("Input Error: Combined total score cannot mathematically exceed 100 points.");
        revertRow(index);
        return;
      }
      
      // Validation Passed: Pre-calculate the new state
      const updatedRow = { ...row, total_score: total, letter_grade: grade, grade_point: point, status: 'draft' };
      
      const newRows = [...rows];
      newRows[index] = updatedRow;
      setRows(newRows);
      
      setIsReleased(false);
      
      // Commit cleanly to Supabase
      await saveRowToDB(updatedRow, newRows, index);
    }
  };

  const handleRelease = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setIsError(false);

    // Bulk update release status to DB
    const selectedCourse = availableCourses.find(c => c.course_code === courseCode);
    if (!selectedCourse) return;

    const { error } = await supabase
      .from('results')
      .update({ status: 'released' })
      .eq('course_id', selectedCourse.id)
      .eq('academic_year', session);

    if (!error) {
      const newRows = rows.map(r => ({ ...r, status: 'released' }));
      setRows(newRows);
      setOriginalRows(JSON.parse(JSON.stringify(newRows)));
      setIsReleased(true);
      setAuthModal(false);
      setAuthPassword("");
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      showError("Database Sync Error: Unable to release results to the student portal.");
    }
    setIsSaving(false);
  };

  const exportToExcel = () => {
    if (rows.length === 0) return;
    const csvContent = [
      "Student Name,Reg. No.,CA,Exam,Total,Grade,Grade Point",
      ...rows.map(r => `"${r.name}","${r.reg_number}",${r.ca_score === '' ? 0 : r.ca_score},${r.exam_score === '' ? 0 : r.exam_score},${r.total_score},"${r.letter_grade}",${r.grade_point}`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `futo_results_${courseCode}_${session.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Toast Notification Banner */}
      <div className={`absolute top-4 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 flex items-center space-x-3 px-6 py-3 rounded-full shadow-lg transition-all duration-300 max-w-[90vw] md:max-w-md ${
        isSaving ? 'bg-indigo-600 text-white translate-y-0 opacity-100' : 
        isError ? 'bg-rose-500 text-white translate-y-0 opacity-100' :
        saveSuccess ? 'bg-emerald-500 text-white translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      }`}>
        {isSaving ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : 
         isError ? <AlertTriangle className="w-5 h-5 shrink-0" /> : 
         <CheckCircle2 className="w-5 h-5 shrink-0" />}
        <span className="text-sm font-bold tracking-wide leading-tight">
          {isSaving ? 'Saving changes to core database ledger...' : 
           isError ? errorMessage : 'Changes synchronized with cloud ledger.'}
        </span>
      </div>

      {/* Section 1: Parameter Controls (25%) */}
      <div className="h-auto md:h-[25%] bg-white border-b border-slate-200 p-6 flex flex-col justify-between shrink-0">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{dept} Result Matrix</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Parameter Selection</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 w-full">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
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
            
            {isStaff && (
              <select 
                value={courseCode} 
                onChange={e => setCourseCode(e.target.value)} 
                disabled={hasNoCourses}
                className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e] w-full sm:w-auto min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingCourses ? (
                  <option value="">Loading...</option>
                ) : hasNoCourses ? (
                  <option value="">Not available</option>
                ) : (
                  availableCourses.map(course => (
                    <option key={course.id} value={course.course_code}>{course.course_code}</option>
                  ))
                )}
              </select>
            )}
            
            <select value={session} onChange={e => setSession(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e]">
              <option value="2023/2024">2023/2024</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </select>
          </div>

          {isStaff && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <button 
                  onClick={() => setUploadPrompt(!uploadPrompt)}
                  disabled={hasNoCourses}
                  className="flex w-full items-center justify-center space-x-2 px-4 py-2 bg-[#f0f9f4] text-[#0d5c2e] font-bold text-sm rounded-lg hover:bg-[#e6f2eb] border border-[#0d5c2e]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>
                {uploadPrompt && (
                  <div className="absolute right-0 top-12 w-64 bg-slate-900 text-white text-xs p-4 rounded-xl shadow-2xl z-50">
                    <p className="font-bold mb-2 text-emerald-400"><AlertTriangle className="inline w-3 h-3 mr-1"/> Expected Column Map:</p>
                    <code className="block bg-slate-800 p-2 rounded text-slate-300">reg_number, ca_score, exam_score</code>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                disabled={hasNoCourses || isGridLoading}
                className={`flex w-full items-center justify-center space-x-2 px-4 py-2 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isEditing 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                <span>{isEditing ? 'Done Editing' : 'Edit Matrix'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Spreadsheet Data Grid (60%) */}
      <div className="h-[60%] overflow-auto bg-slate-50 border-b border-slate-200 print:h-auto relative">
        {hasNoCourses ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium max-w-md leading-relaxed">
              No academic curriculum data has been provided for this department parameters yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Student Name</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Reg. No.</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-24">CA</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-24">Exam</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Total</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Grade</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Grade Point</th>
                {isEditing && <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((row, i) => (
                <tr key={row.student_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-sm font-bold text-slate-900">{row.name}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-600 font-mono">{row.reg_number}</td>
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={row.ca_score}
                        onChange={(e) => handleCellEdit(i, 'ca_score', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700">{row.ca_score}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={row.exam_score}
                        onChange={(e) => handleCellEdit(i, 'exam_score', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700">{row.exam_score}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm font-black text-slate-900">{row.total_score}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-black ${
                      row.letter_grade === 'A' || row.letter_grade === 'B' ? 'bg-[#e6f2eb] text-[#0d5c2e]' : 
                      row.letter_grade === 'F' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {row.letter_grade}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-slate-600">{row.grade_point?.toFixed(2)}</td>
                  {isEditing && (
                    <td className="px-6 py-3">
                      <button 
                        onClick={() => handleKeyDown({ key: 'Enter' } as React.KeyboardEvent, i)}
                        className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded"
                      >
                        Save
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && !isGridLoading && (
                <tr>
                  <td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No records populated for this matrix.
                  </td>
                </tr>
              )}
              {isGridLoading && (
                <tr>
                  <td colSpan={isEditing ? 8 : 7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 3: Action Toolbar (15%) */}
      <div className="h-auto md:h-[15%] w-full flex flex-col sm:flex-row justify-between items-center gap-3 p-4 bg-slate-900/10 border-t border-slate-200 rounded-xl sm:rounded-none shrink-0 print:hidden mt-auto">
        
        <button onClick={handlePrint} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors">
          <Printer className="w-4 h-4" />
          <span>Print Document</span>
        </button>

        {isStaff && (
          <button 
            onClick={() => setAuthModal(true)}
            disabled={!allRowsValid || isReleased || isEditing || hasNoCourses}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3 font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-md ${
              isReleased 
                ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                : allRowsValid && !isEditing
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20' 
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isReleased ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            <span>{isReleased ? 'Results Released' : 'Release Results'}</span>
          </button>
        )}

        <button 
          onClick={exportToExcel} 
          disabled={rows.length === 0}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-white text-[#0d5c2e] font-bold text-sm rounded-lg hover:bg-[#e6f2eb] border border-slate-200 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export .csv</span>
        </button>

      </div>

      {/* Auth Modal Overlay */}
      {authModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Authorize Release</h3>
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
              You are about to permanently publish this ledger to the student view portal. Please verify your identity.
            </p>
            <input 
              type="password" 
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none mb-4"
            />
            <div className="flex space-x-3">
              <button 
                onClick={() => setAuthModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleRelease}
                disabled={!authPassword || isSaving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify & Release'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
