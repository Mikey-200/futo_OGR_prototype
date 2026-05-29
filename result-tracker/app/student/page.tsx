"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, AlertTriangle, Lock, Download, Printer } from "lucide-react";
import { calculateGrade } from "@/lib/gradingEngine";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CourseResult {
  course_code: string;
  title: string;
  credit_units: number;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  letter_grade: string | null;
  grade_point: number | null;
  status: string;
}

export default function StudentLedger() {
  const [userId, setUserId] = useState("");
  const [dept, setDept] = useState("");
  const [level, setLevel] = useState("500L");
  const [semester, setSemester] = useState("Harmattan");
  const [session, setSession] = useState("2024/2025");
  const [studentName, setStudentName] = useState("");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s?.user) return;
      setUserId(s.user.id);
      const { data: student } = await supabase
        .from("students")
        .select("full_name, department, current_level")
        .eq("profile_id", s.user.id)
        .single();
      if (student) {
        setStudentName(student.full_name);
        setDept(student.department);
        setLevel(`${student.current_level}L`);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!userId || !dept) return;
    const fetch = async () => {
      setIsLoading(true);
      const lvlNum = parseInt(level.replace("L", ""));
      const { data: courses } = await supabase
        .from("courses")
        .select("id, course_code, title, credit_units")
        .eq("department", dept)
        .eq("level", lvlNum)
        .eq("semester", semester);

      if (!courses || courses.length === 0) { setResults([]); setIsLoading(false); return; }

      const { data: studentResults } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", userId)
        .eq("academic_year", session)
        .in("course_id", courses.map((c) => c.id));

      const merged: CourseResult[] = courses.map((course) => {
        const r = studentResults?.find((res) => res.course_id === course.id);
        return {
          course_code: course.course_code,
          title: course.title,
          credit_units: course.credit_units,
          ca_score: r?.ca_score ?? null,
          exam_score: r?.exam_score ?? null,
          total_score: r?.total_score ?? null,
          letter_grade: r?.letter_grade ?? null,
          grade_point: r?.grade_point ?? null,
          status: r?.status ?? "draft",
        };
      });

      setResults(merged);
      setIsLoading(false);
    };
    fetch();
  }, [userId, dept, level, semester, session]);

  // Privacy Gate: hide if ANY result is not released OR no results entered yet
  const hasUnreleased = results.some((r) => r.status !== "released");
  const hasAnyResult = results.some((r) => r.ca_score !== null);

  // Semester GPA
  const graded = results.filter((r) => r.total_score !== null && r.grade_point !== null);
  const gpa = graded.length > 0
    ? (graded.reduce((a, r) => a + r.grade_point! * r.credit_units, 0) / graded.reduce((a, r) => a + r.credit_units, 0)).toFixed(2)
    : null;

  const gradeBadge = (g: string | null) => {
    if (!g) return "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]";
    if (g === "A") return "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]";
    if (g === "B") return "bg-sky-50 text-sky-700 border-sky-200";
    if (g === "C") return "bg-amber-50 text-amber-700 border-amber-200";
    if (g === "D") return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const handleExport = () => {
    if (hasUnreleased || !hasAnyResult) return;
    const csv = [
      ["Course Code", "Title", "CA", "Exam", "Total", "Grade", "Grade Point"].join(","),
      ...results.map((r) => [
        r.course_code, `"${r.title}"`, r.ca_score ?? "", r.exam_score ?? "",
        r.total_score ?? "", r.letter_grade ?? "", r.grade_point ?? "",
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_${level}_${session}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Select = ({ value, onChange, children }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] rounded-lg px-3 py-2 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 transition-all appearance-none cursor-pointer shadow-sm"
    >
      {children}
    </select>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">

      {/* ── SECTION 1: Parameters (25%) ── */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex flex-col gap-4 shadow-sm" style={{ minHeight: "25%" }}>
        <div>
          <h2 className="text-[15px] font-black text-[#0F172A] tracking-tight">My Academic Ledger</h2>
          {studentName && <p className="text-[12px] text-[#64748B] font-medium mt-0.5">{studentName}</p>}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Select value={level} onChange={setLevel}>
            {["100L", "200L", "300L", "400L", "500L"].map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select value={dept} onChange={setDept}>
            {["IFT", "CSC", "CYB", "SOE"].map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={semester} onChange={setSemester}>
            <option value="Harmattan">Harmattan</option>
            <option value="Rain">Rain</option>
          </Select>
          <Select value={session} onChange={setSession}>
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </Select>
        </div>
      </div>

      {/* ── SECTION 2: Data Grid (60%) ── */}
      <div className="flex-1 overflow-auto relative" style={{ maxHeight: "60vh" }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex items-center gap-3 text-[13px] font-bold text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin text-[#15803D]" />
              <span>Loading your results...</span>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <p className="text-[13px] text-[#94A3B8] max-w-sm leading-relaxed">
              No courses found for the selected parameters.
            </p>
          </div>
        ) : hasUnreleased || !hasAnyResult ? (
          // ── Privacy Gate ──
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-20 h-20 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center justify-center mb-5 shadow-sm">
              <Lock className="w-9 h-9 text-[#CBD5E1]" />
            </div>
            <h3 className="text-[16px] font-black text-[#0F172A] mb-2">Results Not Available Yet</h3>
            <p className="text-[13px] font-medium text-[#94A3B8] max-w-md leading-relaxed">
              This ledger is awaiting examination board release verification. Please check back later.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[580px] bg-white">
            <thead className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] shadow-sm">
              <tr>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Course</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] hidden md:table-cell">Title</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] w-16">CA</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] w-16">Exam</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Total</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Grade</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Grade Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-3 py-2 text-[13px] font-black font-mono text-[#0F172A]">{r.course_code}</td>
                  <td className="px-3 py-2 text-[12px] text-[#64748B] hidden md:table-cell truncate max-w-[200px]">{r.title}</td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#475569]">{r.ca_score ?? "—"}</td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#475569]">{r.exam_score ?? "—"}</td>
                  <td className="px-3 py-2 text-[13px] font-black font-mono text-[#0F172A]">{r.total_score ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black border ${gradeBadge(r.letter_grade)}`}>
                      {r.letter_grade ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono font-bold text-[#94A3B8]">{r.grade_point ?? "—"}</td>
                </tr>
              ))}
            </tbody>
            {gpa && (
              <tfoot>
                <tr className="bg-[#F8FAFC] border-t-2 border-[#E2E8F0]">
                  <td colSpan={5} className="px-3 py-3 text-[11px] font-black uppercase tracking-widest text-[#94A3B8]">
                    Semester GPA
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-[18px] font-black text-[#15803D]">{gpa}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* ── SECTION 3: Footer (15%) ── */}
      <div className="shrink-0 bg-white border-t border-[#E2E8F0] px-5 py-4 flex items-center justify-between gap-3 shadow-sm no-print" style={{ minHeight: "15%" }}>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] rounded-xl shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>
        <button
          onClick={handleExport}
          disabled={hasUnreleased || !hasAnyResult}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] rounded-xl shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export .csv</span>
        </button>
      </div>
    </div>
  );
}
