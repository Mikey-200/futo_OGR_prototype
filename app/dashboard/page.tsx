"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { 
  UploadCloud, Printer, Download, CheckCircle, Lock, Loader2, 
  Menu, X, LogOut, Users, BookOpen, GraduationCap, Building2,
  Save, Edit3, AlertTriangle, EyeOff, ChevronRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { createClient } from "@/utils/supabase";
import Papa from "papaparse";

// --- TYPES ---
type Role = "hod" | "lecturer" | "student";
type Pane = "results" | "registry" | "student_view";

interface Course {
  id: string;
  course_code: string;
  title: string;
  level: number;
  department: string;
  semester: string;
  is_released: boolean;
}

interface Student {
  profile_id: string;
  reg_number: string;
  full_name: string;
  department: string;
  sex?: string;
  phone_number?: string;
  current_level: number;
}

interface DbResult {
  id?: string;
  student_id: string;
  course_id: string;
  academic_year: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  letter_grade: string;
  grade_point: number;
  is_released: boolean;
}

// --- CONSTANTS ---
const DEPARTMENT = "IFT";

// ==========================================
// 1. STAFF RESULTS MATRIX ENGINE
// ==========================================
const StaffResultsPane = ({ supabase, role }: { supabase: any, role: Role }) => {
  const [level, setLevel] = useState<number | string>(500);
  const [semester, setSemester] = useState("Harmattan");
  const [session, setSession] = useState("2023/2024");
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string>("");
  
  const [resultsUI, setResultsUI] = useState<any[]>([]);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  const [showPasswordOverlay, setShowPasswordOverlay] = useState(false);
  const [password, setPassword] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe parsing for level drop-down
  const parsedLevel = parseInt(level.toString().replace('L', ''), 10) || 500;

  // Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      setIsCoursesLoading(true);
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("level", parsedLevel)
          .eq("department", DEPARTMENT)
          .eq("semester", semester);
          
        if (error) {
          console.error("Supabase Error Details:", error);
          toast.error(error.message);
          throw error;
        }
        
        setCourses(data || []);
        
        // Auto-select the first course on mount/refresh if available
        if (data && data.length > 0) {
          setActiveCourseId(data[0].id);
        } else {
          setActiveCourseId("");
        }
      } catch (err: any) {
        console.error("Failed to load courses", err);
      } finally {
        setIsCoursesLoading(false);
      }
    };
    fetchCourses();
  }, [parsedLevel, semester, supabase]);

  // Fetch Spreadsheet Data
  useEffect(() => {
    const fetchSpreadsheetData = async () => {
      if (!activeCourseId || !session) {
        setResultsUI([]);
        return;
      }
      setIsDataLoading(true);
      try {
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .eq("department", DEPARTMENT)
          .eq("current_level", parsedLevel)
          .order("full_name", { ascending: true });
          
        if (studentsError) {
          console.error("Supabase Error Details:", studentsError);
          toast.error(studentsError.message);
          throw studentsError;
        }

        const { data: resultsData, error: resultsError } = await supabase
          .from("results")
          .select("*")
          .eq("course_id", activeCourseId)
          .eq("academic_year", session);
          
        if (resultsError) {
          console.error("Supabase Error Details:", resultsError);
          toast.error(resultsError.message);
          throw resultsError;
        }

        const merged = (studentsData || []).map((student: Student) => {
          const match = (resultsData || []).find((r: DbResult) => r.student_id === student.profile_id);
          
          // Hydrate with empty default fallback metrics if no result exists in the database
          return {
            profile_id: student.profile_id,
            full_name: student.full_name,
            reg_number: student.reg_number,
            ca_score: match?.ca_score ?? 0,
            exam_score: match?.exam_score ?? 0,
            total_score: match?.total_score ?? 0,
            letter_grade: match?.letter_grade ?? "F",
            grade_point: match?.grade_point ?? 0.0,
            is_released: match?.is_released ?? false
          };
        });
        setResultsUI(merged);
      } catch (err: any) {
        console.error("Data fetch error", err);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchSpreadsheetData();
  }, [activeCourseId, session, parsedLevel, supabase]);

  const calculateGrade = (ca: number, exam: number) => {
    const total = ca + exam;
    if (total >= 70) return { total, letter_grade: "A", grade_point: 5.0 };
    if (total >= 60) return { total, letter_grade: "B", grade_point: 4.0 };
    if (total >= 50) return { total, letter_grade: "C", grade_point: 3.0 };
    if (total >= 40) return { total, letter_grade: "D", grade_point: 2.0 };
    if (total >= 30) return { total, letter_grade: "E", grade_point: 1.0 };
    return { total, letter_grade: "F", grade_point: 0.0 };
  };

  const handleCellChange = (profileId: string, field: "ca_score" | "exam_score", value: string) => {
    if (!isEditMode) return;
    const numValue = value === "" ? 0 : parseFloat(value);
    
    if (field === "ca_score" && numValue > 40) return toast.error("CA score cannot exceed 40");
    if (field === "exam_score" && numValue > 70) return toast.error("Exam score cannot exceed 70");
    if (numValue < 0) return toast.error("Score cannot be negative");

    setResultsUI(prev => prev.map(student => {
      if (student.profile_id === profileId) {
        const updatedCa = field === "ca_score" ? numValue : student.ca_score;
        const updatedExam = field === "exam_score" ? numValue : student.exam_score;
        const { total, letter_grade, grade_point } = calculateGrade(updatedCa, updatedExam);
        return { 
          ...student, 
          ca_score: updatedCa, 
          exam_score: updatedExam, 
          total_score: total, 
          letter_grade, 
          grade_point 
        };
      }
      return student;
    }));
  };

  const handleBulkSave = async () => {
    if (!activeCourseId) {
      toast.error("Please select a valid course code before saving changes.");
      return;
    }
    setIsDataLoading(true);
    
    const payload = resultsUI.map(student => ({
      student_id: student.profile_id,
      course_id: activeCourseId,
      academic_year: session,
      semester: semester,
      ca_score: student.ca_score,
      exam_score: student.exam_score,
      total_score: student.total_score,
      letter_grade: student.letter_grade,
      grade_point: student.grade_point,
      is_released: student.is_released
    }));

    try {
      const { error } = await supabase.from("results").upsert(payload, { onConflict: "student_id,course_id,academic_year" });
      if (error) {
        console.error("Supabase Error Details:", error);
        toast.error(error.message);
        throw error;
      }
      toast.success("Metrics layout saved successfully!");
      setIsEditMode(false);
    } catch (err: any) {
      console.error("Failed to batch save metrics layout", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let hasError = false;
        
        const updatedUI = resultsUI.map(student => {
          const csvRow = results.data.find((row: any) => 
            (row.RegNo || row.reg_no || row.reg_number || row.regNo || "").trim().toLowerCase() === student.reg_number.toLowerCase()
          ) as any;

          if (csvRow) {
            const parsedCA = csvRow.CA ? parseFloat(csvRow.CA) : 0;
            const parsedExam = csvRow.Exam ? parseFloat(csvRow.Exam) : 0;
            
            if (parsedCA > 40) {
              toast.error(`CSV Parsing Aborted: CA > 40 found for ${student.reg_number}`);
              hasError = true;
            }
            if (parsedExam > 70) {
              toast.error(`CSV Parsing Aborted: Exam > 70 found for ${student.reg_number}`);
              hasError = true;
            }

            if (!hasError) {
              const { total, letter_grade, grade_point } = calculateGrade(parsedCA, parsedExam);
              return {
                ...student,
                ca_score: parsedCA,
                exam_score: parsedExam,
                total_score: total,
                letter_grade,
                grade_point
              };
            }
          }
          return student;
        });

        if (!hasError) {
          setResultsUI(updatedUI);
          setIsEditMode(true);
          toast.success("CSV Ingested: Verify metrics before saving.");
        }
        
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: () => {
        toast.error("Failed to parse the CSV file. Ensure it is correctly formatted.");
      }
    });
  };

  const handleReleaseResults = async () => {
    if (password === "futoadmin") {
      if (!activeCourseId) return toast.error("No course selected");
      setIsReleasing(true);
      try {
        const { error } = await supabase.from("results").update({ is_released: true }).eq("course_id", activeCourseId).eq("academic_year", session);
        if (error) {
          console.error("Supabase Error Details:", error);
          toast.error(error.message);
          throw error;
        }
        
        setShowPasswordOverlay(false);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#15803d", "#22c55e", "#ffffff"] });
        toast.success("Results Released Successfully!");
        
        setResultsUI(prev => prev.map(s => ({ ...s, is_released: true })));
      } catch (err: any) {
        console.error("Release failed", err);
      } finally {
        setIsReleasing(false);
        setPassword("");
      }
    } else {
      toast.error("Invalid authorization password");
    }
  };

  const hasNoData = !isDataLoading && resultsUI.length === 0;

  return (
    <div className="h-full flex flex-col bg-white text-gray-900">
      <div className="flex-none p-8 pb-4">
        <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-none mb-1">IFT Result Matrix</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PARAMETER SELECTION</p>
      </div>

      <div className="flex-none px-4 sm:px-8 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 gap-4">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:items-center md:space-x-3">
          <select value={level} onChange={e => setLevel(e.target.value)} className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
            {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l}L</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
            <option value="Harmattan">Harmattan</option>
            <option value="Rain">Rain</option>
          </select>
          <select value={activeCourseId} onChange={e => setActiveCourseId(e.target.value)} disabled={isCoursesLoading} className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e] disabled:bg-gray-50 min-w-[120px]">
            {isCoursesLoading && <option>Loading...</option>}
            {!isCoursesLoading && courses.length === 0 && <option value="">Not available</option>}
            {!isCoursesLoading && courses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.title}</option>)}
          </select>
          <select value={session} onChange={e => setSession(e.target.value)} className="w-full md:w-auto px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
            {["2025/2026", "2024/2025", "2023/2024"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        {(role === "hod" || role === "lecturer") && (
          <div className="flex items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-400 hover:text-gray-700 transition-colors px-2 sm:px-0">
              <UploadCloud className="w-4 h-4" /> Upload File
            </button>
            <button onClick={() => isEditMode ? handleBulkSave() : setIsEditMode(true)} className={`flex items-center gap-2 text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-lg transition-all ${isEditMode ? "bg-[#105e2e] text-white shadow-md" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-gray-200 sm:border-transparent"}`}>
              {isEditMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditMode ? "Save Metrics Layout" : "Edit Matrix"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 w-full overflow-x-auto scrollbar-thin bg-white relative p-4 sm:p-8">
        {isDataLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-40"><Loader2 className="w-8 h-8 animate-spin text-[#105e2e]" /></div>}
        
        {hasNoData && !isDataLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <p className="text-gray-400 font-medium text-sm max-w-[250px]">
              No academic curriculum data has been provided for this department parameters yet.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-gray-400 uppercase text-[10px] tracking-wider font-extrabold pb-4 border-b border-gray-100">
              <tr>
                <th className="px-2 py-3 sticky left-0 bg-white z-20 min-w-[140px] shadow-[1px_0_0_0_#f3f4f6]">Student Name</th>
                <th className="px-2 py-3 sticky left-[140px] bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px]">Reg. Number</th>
                <th className="px-2 py-3 text-center">CA</th>
                <th className="px-2 py-3 text-center">Exam</th>
                <th className="px-2 py-3 text-center">Total</th>
                <th className="px-2 py-3 text-center">GP</th>
                <th className="px-2 py-3 text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resultsUI.map((student) => (
                <tr key={student.profile_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-2 py-4 font-bold text-gray-800 sticky left-0 bg-white z-20 shadow-[1px_0_0_0_#f3f4f6] truncate max-w-[140px] min-w-[140px]">{student.full_name}</td>
                  <td className="px-2 py-4 text-gray-500 font-mono text-xs font-semibold sticky left-[140px] bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px]">{student.reg_number}</td>
                  <td className="px-2 py-4 text-center">
                    {isEditMode ? (
                      <input type="number" value={student.ca_score ?? ""} onChange={e => handleCellChange(student.profile_id, "ca_score", e.target.value)} className="w-16 p-1.5 text-center border border-gray-200 rounded-md focus:ring-2 focus:ring-[#105e2e] outline-none text-sm font-semibold" max={40} min={0} />
                    ) : <span className="font-semibold text-gray-700">{student.ca_score}</span>}
                  </td>
                  <td className="px-2 py-4 text-center">
                    {isEditMode ? (
                      <input type="number" value={student.exam_score ?? ""} onChange={e => handleCellChange(student.profile_id, "exam_score", e.target.value)} className="w-16 p-1.5 text-center border border-gray-200 rounded-md focus:ring-2 focus:ring-[#105e2e] outline-none text-sm font-semibold" max={70} min={0} />
                    ) : <span className="font-semibold text-gray-700">{student.exam_score}</span>}
                  </td>
                  <td className="px-2 py-4 text-center font-bold text-gray-900">{student.total_score}</td>
                  <td className="px-2 py-4 text-center font-mono font-bold text-gray-500">{student.grade_point?.toFixed(1)}</td>
                  <td className="px-2 py-4 text-center">
                    <span className="font-bold text-[#105e2e]">{student.letter_grade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 sm:p-4 bg-gray-50 border-t border-gray-100 z-30">
        <button onClick={() => window.print()} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 bg-white sm:bg-transparent border sm:border-0 border-gray-200 hover:bg-gray-100 rounded-lg text-gray-600 sm:text-gray-500 font-bold text-xs sm:text-sm tracking-wide uppercase transition-colors">
          <Printer className="w-4 h-4"/> Print Document
        </button>
        
        {(role === "hod" || role === "lecturer") && (
          <button onClick={() => setShowPasswordOverlay(true)} disabled={hasNoData || !activeCourseId} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 sm:px-10 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all">
            <Lock className="w-4 h-4" /> RELEASE RESULTS
          </button>
        )}
        
        <button onClick={() => toast.success("Exporting CSV...")} className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 bg-green-50 hover:bg-green-100 rounded-lg text-[#105e2e] font-bold text-xs sm:text-sm tracking-wide uppercase transition-colors">
          <Download className="w-4 h-4"/> Export .xlsx
        </button>
      </div>

      {showPasswordOverlay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Confirm Release</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Enter 'futoadmin' to securely release grades to the portal.</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-[#105e2e] outline-none font-medium" autoFocus placeholder="Password" />
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordOverlay(false)} className="flex-1 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleReleaseResults} disabled={isReleasing} className="flex-1 py-3 bg-[#4f46e5] text-white rounded-xl font-bold shadow-md shadow-indigo-500/20">{isReleasing ? 'Releasing...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. HOD STUDENT REGISTRY ENGINE
// ==========================================
const StudentRegistryPane = ({ supabase }: { supabase: any }) => {
  const [level, setLevel] = useState<number | string>(500);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const parsedLevel = parseInt(level.toString().replace('L', ''), 10) || 500;

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("department", DEPARTMENT)
          .eq("current_level", parsedLevel)
          .order("full_name");
          
        if (error) {
          console.error("Supabase Error Details:", error);
          toast.error(error.message);
          throw error;
        }
        
        setStudents(data || []);
      } catch (err) {
        console.error("Failed to load students registry", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [parsedLevel, supabase]);

  const handleFieldChange = (profileId: string, field: keyof Student, value: string) => {
    setStudents(prev => prev.map(s => s.profile_id === profileId ? { ...s, [field]: value } : s));
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    let hasError = false;
    for (const student of students) {
      if (student.reg_number.length !== 10) {
        toast.error(`Invalid Reg No: ${student.reg_number} (Must be exactly 10 digits)`);
        hasError = true;
        continue;
      }
      try {
        const { error } = await supabase.from("students").upsert({
          profile_id: student.profile_id,
          reg_number: student.reg_number,
          full_name: student.full_name,
          department: student.department,
          sex: student.sex,
          phone_number: student.phone_number,
          current_level: student.current_level
        }, { onConflict: "profile_id" });
        
        if (error) {
          console.error("Supabase Error Details:", error);
          toast.error(error.message);
          hasError = true;
        }
      } catch (e) {
        hasError = true;
      }
    }
    setIsLoading(false);
    setIsEditMode(false);
    if (!hasError) toast.success("Registry saved successfully");
    else toast.error("Some records failed to save. Check constraints.");
  };

  return (
    <div className="h-full flex flex-col bg-white text-gray-900">
      <div className="flex-none p-8 pb-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-none mb-1">Student Registry Hub</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DEPARTMENT OF INFORMATION TECHNOLOGY</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select value={level} onChange={e => setLevel(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
            {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l}L</option>)}
          </select>
          
          <button onClick={() => isEditMode ? handleSaveAll() : setIsEditMode(true)} className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-colors ${isEditMode ? "bg-[#105e2e] text-white shadow-green-900/20" : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"}`}>
            {isEditMode ? <><Save className="w-4 h-4"/> Save Registry</> : <><Edit3 className="w-4 h-4"/> Edit List</>}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8 relative">
        {isLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-40"><Loader2 className="w-8 h-8 animate-spin text-[#105e2e]" /></div>}
        {!isLoading && (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-gray-400 uppercase text-[10px] tracking-wider font-extrabold pb-4 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Reg Number (10 Digits)</th>
                <th className="px-4 py-3">Sex</th>
                <th className="px-4 py-3">Phone Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(student => (
                <tr key={student.profile_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-800">
                    {isEditMode ? <input className="w-full px-3 py-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-[#105e2e] outline-none" value={student.full_name} onChange={e => handleFieldChange(student.profile_id, "full_name", e.target.value)} /> : student.full_name}
                  </td>
                  <td className="px-4 py-4 text-gray-500 font-mono text-xs font-semibold">
                    {isEditMode ? <input className="w-full px-3 py-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-[#105e2e] outline-none" maxLength={10} value={student.reg_number} onChange={e => handleFieldChange(student.profile_id, "reg_number", e.target.value)} /> : student.reg_number}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-600">
                    {isEditMode ? (
                      <select className="w-full px-3 py-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-[#105e2e] outline-none" value={student.sex || ""} onChange={e => handleFieldChange(student.profile_id, "sex", e.target.value)}>
                        <option value="">-</option><option value="Male">Male</option><option value="Female">Female</option>
                      </select>
                    ) : student.sex || "-"}
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-600">
                    {isEditMode ? <input className="w-full px-3 py-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-[#105e2e] outline-none" value={student.phone_number || ""} onChange={e => handleFieldChange(student.profile_id, "phone_number", e.target.value)} /> : student.phone_number || "-"}
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-gray-400 font-medium text-sm">No students found for this level.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. STUDENT PERFORMANCE ENGINE
// ==========================================
const StudentPerformancePane = ({ supabase, userProfileId }: { supabase: any, userProfileId: string }) => {
  const [level, setLevel] = useState<number | string>(500);
  const [semester, setSemester] = useState("Harmattan");
  const [session, setSession] = useState("2023/2024");
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const parsedLevel = parseInt(level.toString().replace('L', ''), 10) || 500;

  useEffect(() => {
    const fetchStudentResults = async () => {
      setIsLoading(true);
      setIsLocked(false);
      try {
        if (!userProfileId) {
          setIsLoading(false);
          return;
        }

        const { data: cData, error: cError } = await supabase
          .from("courses")
          .select("id, course_code, title")
          .eq("level", parsedLevel)
          .eq("semester", semester)
          .eq("department", DEPARTMENT);
          
        if (cError) {
          console.error("Supabase Error Details:", cError);
          toast.error(cError.message);
          throw cError;
        }

        if (!cData || cData.length === 0) {
          setResults([]);
          setIsLoading(false);
          return;
        }

        const courseIds = cData.map((c: any) => c.id);
        
        const { data: rData, error: rError } = await supabase
          .from("results")
          .select("*")
          .eq("student_id", userProfileId)
          .eq("academic_year", session)
          .in("course_id", courseIds);
          
        if (rError) {
          console.error("Supabase Error Details:", rError);
          toast.error(rError.message);
          throw rError;
        }
        
        const unreleasedExists = rData?.some((r: any) => r.is_released === false);
        
        if (unreleasedExists) {
          setIsLocked(true);
          setResults([]);
        } else {
          const uiData = cData.map((c: any) => {
            const res = (rData || []).find((r: any) => r.course_id === c.id);
            return {
              courseCode: c.course_code,
              courseTitle: c.title,
              ca_score: res?.ca_score ?? 0,
              exam_score: res?.exam_score ?? 0,
              total_score: res?.total_score ?? 0,
              letter_grade: res?.letter_grade ?? "F",
              grade_point: res?.grade_point ?? 0.0
            };
          });
          setResults(uiData);
        }
      } catch (e) {
        console.error("Failed to fetch performance data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentResults();
  }, [parsedLevel, semester, session, userProfileId, supabase]);

  return (
    <div className="h-full flex flex-col bg-white text-gray-900">
      <div className="flex-none p-8 pb-4">
        <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-none mb-1">Academic Profile</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PERFORMANCE DASHBOARD</p>
      </div>

      <div className="flex-none px-8 pb-6 flex items-center gap-3 border-b border-gray-100">
        <select value={level} onChange={e => setLevel(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
          {[100, 200, 300, 400, 500].map(l => <option key={l} value={l}>{l}L</option>)}
        </select>
        <select value={semester} onChange={e => setSemester(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
          <option value="Harmattan">Harmattan</option>
          <option value="Rain">Rain</option>
        </select>
        <select value={session} onChange={e => setSession(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-700 outline-none focus:border-[#105e2e] focus:ring-1 focus:ring-[#105e2e]">
          <option value="2025/2026">2025/2026</option>
          <option value="2024/2025">2024/2025</option>
          <option value="2023/2024">2023/2024</option>
        </select>
      </div>

      <div className="flex-1 p-8 overflow-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-40"><Loader2 className="w-8 h-8 animate-spin text-[#105e2e]" /></div>
        ) : isLocked ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
              <EyeOff className="w-8 h-8" />
            </div>
            <p className="text-gray-400 font-medium text-sm max-w-[280px]">
              Your results for this semester are currently pending departmental release.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-gray-400 uppercase text-[10px] tracking-wider font-extrabold pb-4 border-b border-gray-100">
              <tr>
                <th className="px-2 py-3">Course Code</th>
                <th className="px-2 py-3 text-center">CA</th>
                <th className="px-2 py-3 text-center">Exam</th>
                <th className="px-2 py-3 text-center">Total</th>
                <th className="px-2 py-3 text-center">Grade</th>
                <th className="px-2 py-3 text-center">GP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-2 py-4 font-bold text-gray-800 flex flex-col"><span className="text-[13px]">{r.courseCode}</span><span className="text-[11px] text-gray-400 font-medium">{r.courseTitle}</span></td>
                  <td className="px-2 py-4 text-center font-semibold text-gray-700">{r.ca_score}</td>
                  <td className="px-2 py-4 text-center font-semibold text-gray-700">{r.exam_score}</td>
                  <td className="px-2 py-4 text-center font-bold text-gray-900">{r.total_score}</td>
                  <td className="px-2 py-4 text-center"><span className="font-bold text-[#105e2e]">{r.letter_grade}</span></td>
                  <td className="px-2 py-4 text-center font-mono text-gray-500 font-bold">{r.grade_point?.toFixed(1)}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400 font-medium text-sm">No courses registered for this selection.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN SHELL (ROUTER & SIDEBAR)
// ==========================================
export default function DashboardShell() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userProfileId, setUserProfileId] = useState("");
  const [activePane, setActivePane] = useState<Pane>("results");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const initSession = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        console.error("Auth Session Error:", authError);
        router.push("/");
        return;
      }
      setUserEmail(authData.user.email || "Unknown User");
      setUserProfileId(authData.user.id);
      
      const { data: userData, error: userError } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
      if (userError || !userData) {
        console.error("Supabase Error Details:", userError);
        toast.error("Failed to fetch user role metadata.");
        router.push("/");
        return;
      }
      
      const userRole = userData.role.toLowerCase() as Role;
      setRole(userRole);
      
      if (userRole === "student") {
        setActivePane("student_view");
      }
    };
    initSession();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/");
  };

  if (!role) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 animate-spin text-[#105e2e]" /></div>;

  return (
    <div className="h-screen w-full flex bg-gray-50 font-sans overflow-hidden text-gray-900">
      <Toaster position="top-right" />
      
      {/* SIDEBAR - STRICT IFT RESULT CORE */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 shadow-2xl md:shadow-none`}>
        
        {/* LOGO HEADER */}
        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#105e2e] rounded shadow flex items-center justify-center text-white font-bold text-lg">F</div>
          <div>
            <h1 className="font-extrabold text-[15px] tracking-tight text-gray-900 leading-tight">IFT Result Core</h1>
            <p className="text-[9px] font-bold text-[#105e2e] uppercase tracking-widest mt-0.5">FEDERAL UNIVERSITY</p>
          </div>
          <button className="md:hidden ml-auto text-gray-400" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROFILE CARD */}
        <div className="p-6 pb-2">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col items-start gap-1">
            <p className="font-bold text-gray-800 text-sm w-full truncate">
              {userEmail}
            </p>
            <span className="inline-block px-2 py-0.5 bg-[#105e2e] text-white text-[10px] font-extrabold uppercase rounded-sm tracking-wider">
              {role}
            </span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {(role === "hod" || role === "lecturer") && (
            <>
              <button onClick={() => { setActivePane("results"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activePane === "results" ? "bg-gray-50 text-gray-900 font-bold" : "text-gray-500 font-semibold hover:bg-gray-50/50"}`}>
                <span className="flex items-center gap-3 text-sm"><BookOpen className="w-4 h-4 opacity-70" /> Results Matrix Canvas</span>
                {activePane === "results" && <div className="w-1 h-4 bg-[#105e2e] rounded-full"></div>}
              </button>
              
              <button onClick={() => { setActivePane("registry"); setIsMobileMenuOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activePane === "registry" ? "bg-gray-50 text-gray-900 font-bold" : "text-gray-500 font-semibold hover:bg-gray-50/50"}`}>
                <span className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 opacity-70" /> Students Registry Hub</span>
                {activePane === "registry" && <div className="w-1 h-4 bg-[#105e2e] rounded-full"></div>}
              </button>
            </>
          )}

          {role === "student" && (
            <>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 text-gray-900 font-bold cursor-default">
                <span className="flex items-center gap-3 text-sm"><GraduationCap className="w-4 h-4 opacity-70" /> Academic Profile</span>
                <div className="w-1 h-4 bg-[#105e2e] rounded-full"></div>
              </button>
            </>
          )}
        </div>

        {/* SIGN OUT - ABSOLUTE BOTTOM */}
        <div className="p-4 border-t border-gray-50">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-bold text-sm transition-all group">
            <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] group-hover:scale-105 transition-transform">
              <LogOut className="w-3 h-3" />
            </div>
            Sign Out
          </button>
        </div>
      </div>

      {/* MOBILE HAMBURGER OVERLAY */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* MAIN CONTENT PANE */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative z-0">
        <div className="md:hidden h-16 border-b border-gray-100 flex items-center px-4">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-500 p-2"><Menu className="w-6 h-6" /></button>
          <div className="w-6 h-6 bg-[#105e2e] rounded shadow flex items-center justify-center text-white font-bold text-xs ml-2">F</div>
          <span className="ml-2 font-extrabold text-[15px] text-gray-900">IFT Result Core</span>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {activePane === "results" && <StaffResultsPane supabase={supabase} role={role} />}
          {activePane === "registry" && (role === "hod" || role === "lecturer") && <StudentRegistryPane supabase={supabase} />}
          {activePane === "student_view" && role === "student" && <StudentPerformancePane supabase={supabase} userProfileId={userProfileId} />}
        </div>
      </div>
    </div>
  );
}
