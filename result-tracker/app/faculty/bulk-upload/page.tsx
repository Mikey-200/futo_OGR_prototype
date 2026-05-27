"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { calculateGrade } from "@/lib/gradingEngine";
import Link from "next/link";
import { FutoSchool, FutoSemester, Course } from "@/types";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface CSVRow {
  reg_number: string;
  ca_score: string;
  exam_score: string;
}

interface ProcessedRow {
  reg_number: string;
  ca_score: number;
  exam_score: number;
  total_score: number;
  letter_grade: string;
  grade_point: number;
  status: "Valid" | "Error";
  errorMsg?: string;
  student_id?: string;
}

const SCHOOLS: FutoSchool[] = ['SICT', 'SEET', 'SOES', 'SOHT', 'SAAT', 'SMAT'];
const DEPARTMENTS: Record<string, string[]> = {
  'SICT': ['IFT', 'CSC', 'CYB', 'SE'],
  'SEET': ['EEE', 'MME', 'CHE', 'CVE', 'FST'],
};
const LEVELS = [100, 200, 300, 400, 500];
const SEMESTERS: FutoSemester[] = ['Harmattan', 'Rain'];

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  
  // FUTO Coordinates
  const [school, setSchool] = useState<FutoSchool>('SICT');
  const [dept, setDept] = useState("IFT");
  const [level, setLevel] = useState(500);
  const [semester, setSemester] = useState<FutoSemester>('Harmattan');
  
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [fetchingCourses, setFetchingCourses] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);

  useEffect(() => {
    if (DEPARTMENTS[school] && !DEPARTMENTS[school].includes(dept)) {
      setDept(DEPARTMENTS[school][0]);
    }
  }, [school, dept]);

  // Fetch courses when coordinates change
  useEffect(() => {
    async function fetchCourses() {
      setFetchingCourses(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('school', school)
        .eq('department', dept)
        .eq('level', level)
        .eq('semester', semester);

      if (!error && data) {
        setAvailableCourses(data);
        if (data.length > 0) {
          setSelectedCourseId(data[0].id);
        } else {
          setSelectedCourseId("");
        }
      }
      setFetchingCourses(false);
    }
    fetchCourses();
  }, [school, dept, level, semester]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (!file) {
      setMessage({ text: "Please select a file.", type: "error" });
      return;
    }
    if (!selectedCourseId || !academicYear) {
      setMessage({ text: "Academic Year and Course Code are required.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          
          if (rows.length === 0) throw new Error("The uploaded CSV is empty.");
          
          const firstRow = rows[0];
          if (!("reg_number" in firstRow) || !("ca_score" in firstRow) || !("exam_score" in firstRow)) {
            throw new Error("CSV must contain 'reg_number', 'ca_score', and 'exam_score' headers.");
          }

          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr || !authData.user) throw new Error("Authentication error. Please log in again.");
          const uploadedBy = authData.user.id;

          const regNumbers = rows.map(r => r.reg_number).filter(Boolean);
          const { data: studentsData, error: studentsErr } = await supabase
            .from("students")
            .select("profile_id, reg_number")
            .in("reg_number", regNumbers);
            
          if (studentsErr) throw new Error("Failed to validate student registration numbers.");
          
          const studentMap = new Map();
          studentsData?.forEach(s => studentMap.set(s.reg_number, s.profile_id));

          let hasErrors = false;
          const processed: ProcessedRow[] = rows.map((row) => {
            const ca = parseFloat(row.ca_score);
            const exam = parseFloat(row.exam_score);
            const reg = row.reg_number;
            
            let status: "Valid" | "Error" = "Valid";
            let errorMsg = "";
            let student_id = studentMap.get(reg);

            if (!student_id) {
              status = "Error";
              errorMsg = "Student not found.";
            } else if (isNaN(ca) || ca < 0 || ca > 30) {
              status = "Error";
              errorMsg = "CA score must be between 0 and 30.";
            } else if (isNaN(exam) || exam < 0 || exam > 70) {
              status = "Error";
              errorMsg = "Exam score must be between 0 and 70.";
            }

            const total = (isNaN(ca) ? 0 : ca) + (isNaN(exam) ? 0 : exam);
            const { letterGrade, gradePoint } = calculateGrade(total);

            if (status === "Error") hasErrors = true;

            return {
              reg_number: reg,
              ca_score: ca,
              exam_score: exam,
              total_score: total,
              letter_grade: letterGrade,
              grade_point: gradePoint,
              status,
              errorMsg,
              student_id
            };
          });

          setProcessedData(processed);

          if (hasErrors) {
            setLoading(false);
            setMessage({ text: "Validation failed. Please review the errors in the table below.", type: "error" });
            return;
          }

          const insertPayload = processed.map(row => ({
            student_id: row.student_id,
            course_id: selectedCourseId,
            ca_score: row.ca_score,
            exam_score: row.exam_score,
            letter_grade: row.letter_grade,
            grade_point: row.grade_point,
            academic_year: academicYear,
            semester: semester,
            uploaded_by: uploadedBy
          }));

          const { error: insertErr } = await supabase.from("results").insert(insertPayload);
          if (insertErr) throw new Error("Database insertion failed: " + insertErr.message);

          setMessage({ text: `Successfully uploaded ${processed.length} results.`, type: "success" });
        } catch (err: any) {
          setMessage({ text: err.message || "Failed to process file.", type: "error" });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        setMessage({ text: `CSV Parse Error: ${error.message}`, type: "error" });
        setLoading(false);
      }
    });
  };

  const getBadgeStyles = (grade: string) => {
    if (grade === 'A' || grade === 'B') return "bg-[#e6f2eb] text-[#0d5c2e] border border-[#0d5c2e]/20";
    if (grade === 'C' || grade === 'D') return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-rose-100 text-rose-800 border border-rose-200";
  };

  return (
    <div className="min-h-screen p-8 bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/faculty" className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#0d5c2e] transition">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bulk Matrix Upload</h1>
        </div>

        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-6">
            Upload a CSV containing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200">reg_number</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200">ca_score</code>, and <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 border border-slate-200">exam_score</code>.
          </p>
          
          {message.text && (
            <div className={`p-4 rounded-xl mb-6 border flex items-center space-x-3 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#e6f2eb] text-[#0d5c2e] border-[#0d5c2e]/20'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              <p className="text-sm font-semibold">{message.text}</p>
            </div>
          )}

          {/* Filtering Matrix */}
          <div className="grid md:grid-cols-4 gap-4 mb-6 p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">School</label>
              <select 
                value={school} 
                onChange={(e) => setSchool(e.target.value as FutoSchool)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
              >
                {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Department</label>
              <select 
                value={dept} 
                onChange={(e) => setDept(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
              >
                {(DEPARTMENTS[school] || [dept]).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Level</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
              >
                {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Semester</label>
              <select 
                value={semester} 
                onChange={(e) => setSemester(e.target.value as FutoSemester)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
              >
                {SEMESTERS.map(s => <option key={s} value={s}>{s} Semester</option>)}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Course Module</label>
              <select 
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={fetchingCourses || availableCourses.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition outline-none disabled:opacity-50" 
              >
                {fetchingCourses ? (
                  <option>Loading courses...</option>
                ) : availableCourses.length === 0 ? (
                  <option>No courses found for this coordinate</option>
                ) : (
                  availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_code} - {c.title}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Academic Year</label>
              <input 
                type="text" 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2023/2024"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition outline-none" 
              />
            </div>
          </div>
          
          <div className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl p-12 text-center hover:bg-slate-100 hover:border-[#0d5c2e]/50 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="mx-auto h-12 w-12 text-slate-400 group-hover:text-[#0d5c2e] transition-colors mb-4" />
            <p className="text-sm text-slate-700 font-semibold">{file ? file.name : "Click or drag to load CSV matrix"}</p>
            <p className="text-xs font-medium text-slate-500 mt-2">Maximum file size 5MB</p>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={processFile}
              disabled={loading || !file || !selectedCourseId || !academicYear}
              className="bg-[#0d5c2e] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#0a4a25] transition-all disabled:opacity-50 shadow-sm tracking-wide flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>{loading ? "Processing..." : "Process & Compile"}</span>
            </button>
          </div>
        </div>

        {/* Data Preview Table */}
        {processedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-5 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800">Validation Preview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Reg Number</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">CA</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Exam</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Grade</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.status === 'Error' ? 'bg-rose-50/50' : ''}`}>
                      <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-900">{row.reg_number}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600">{row.ca_score}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600">{row.exam_score}</td>
                      <td className="px-6 py-3 whitespace-nowrap font-black text-slate-900">{row.total_score}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getBadgeStyles(row.letter_grade)}`}>
                          {row.letter_grade} ({row.grade_point})
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {row.status === 'Valid' ? (
                          <span className="text-[#0d5c2e] font-bold flex items-center text-[11px] tracking-wider uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Valid
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold text-xs flex items-center">
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            {row.errorMsg}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
