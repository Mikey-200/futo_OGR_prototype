"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, AlertTriangle, Lock, Download } from "lucide-react";
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
  const [results, setResults] = useState<CourseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [studentName, setStudentName] = useState("");

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

      // 1. Get courses matching params
      const { data: courses } = await supabase
        .from("courses")
        .select("id, course_code, title, credit_units")
        .eq("department", dept)
        .eq("level", lvlNum)
        .eq("semester", semester);

      if (!courses || courses.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // 2. Get student results for these courses
      const courseIds = courses.map((c) => c.id);
      const { data: studentResults } = await supabase
        .from("results")
        .select("*")
        .eq("student_id", userId)
        .eq("academic_year", session)
        .in("course_id", courseIds);

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

  // Privacy gate: if ANY result in the set is not released, hide everything
  const hasUnreleased = results.some((r) => r.status !== "released");
  const hasAnyResult = results.some((r) => r.ca_score !== null);

  // Compute GPA
  const gradedCourses = results.filter((r) => r.total_score !== null && r.grade_point !== null);
  const gpa = gradedCourses.length > 0
    ? (
        gradedCourses.reduce((acc, r) => acc + (r.grade_point! * r.credit_units), 0) /
        gradedCourses.reduce((acc, r) => acc + r.credit_units, 0)
      ).toFixed(2)
    : null;

  const gradeBadgeClass = (grade: string | null) => {
    if (!grade) return "bg-[#1E293B] text-[#475569] border-[#1E293B]";
    if (grade === "A") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
    if (grade === "B") return "bg-sky-500/20 text-sky-400 border-sky-500/20";
    if (grade === "C") return "bg-amber-500/20 text-amber-400 border-amber-500/20";
    if (grade === "D") return "bg-orange-500/20 text-orange-400 border-orange-500/20";
    return "bg-rose-500/20 text-rose-400 border-rose-500/20";
  };

  const handleExport = () => {
    if (hasUnreleased || !hasAnyResult) return;
    const headers = ["Course Code", "Title", "CA", "Exam", "Total", "Grade", "GPA"];
    const csvRows = results.map((r) =>
      [r.course_code, `"${r.title}"`, r.ca_score ?? "", r.exam_score ?? "", r.total_score ?? "", r.letter_grade ?? "", r.grade_point ?? ""].join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_${level}_${session}_my_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SelectInput = ({ value, onChange, children }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#0F1524] border border-[#1E293B] text-[12px] font-semibold text-[#F8FAFC] rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
    >
      {children}
    </select>
  );

  return (
    <div className="flex flex-col h-screen bg-[#070A12] overflow-hidden">

      {/* ── SECTION 1: Parameters (25%) ── */}
      <div className="shrink-0 h-auto md:h-[25%] bg-[#0A0F1C] border-b border-[#1E293B] px-5 py-4 flex flex-col justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-black text-[#F8FAFC] tracking-tight">
            My Academic Ledger
          </h2>
          {studentName && (
            <p className="text-[12px] text-[#64748B] font-medium mt-0.5">{studentName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <SelectInput value={level} onChange={setLevel}>
            {["100L", "200L", "300L", "400L", "500L"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </SelectInput>

          <SelectInput value={dept} onChange={setDept}>
            {["IFT", "CSC", "CYB", "SOE"].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </SelectInput>

          <SelectInput value={semester} onChange={setSemester}>
            <option value="Harmattan">Harmattan</option>
            <option value="Rain">Rain</option>
          </SelectInput>

          <SelectInput value={session} onChange={setSession}>
            <option value="2023/2024">2023/2024</option>
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </SelectInput>
        </div>
      </div>

      {/* ── SECTION 2: Data Grid (60%) ── */}
      <div className="flex-1 overflow-auto relative" style={{ maxHeight: "60vh" }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 text-[13px] font-bold text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading your results...</span>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-[#0F1524] border border-[#1E293B] rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-[#334155]" />
            </div>
            <p className="text-[13px] font-medium text-[#475569] max-w-sm leading-relaxed">
              No courses found for the selected parameters.
            </p>
          </div>
        ) : hasUnreleased || !hasAnyResult ? (
          // Privacy Gate
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-[#0F1524] border border-[#1E293B] rounded-2xl flex items-center justify-center mb-5">
              <Lock className="w-9 h-9 text-[#334155]" />
            </div>
            <h3 className="text-[15px] font-black text-[#F8FAFC] mb-2">
              Results Not Available Yet
            </h3>
            <p className="text-[13px] font-medium text-[#475569] max-w-md leading-relaxed">
              This ledger is awaiting examination board release verification. Check back later.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-[#0A0F1C] border-b border-[#1E293B]">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Course</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] hidden md:table-cell">Title</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] w-16">CA</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] w-16">Exam</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Total</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Grade</th>
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F1524]">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-[#0F1524]/60 transition-colors">
                    <td className="px-3 py-2 text-[12px] font-black font-mono text-[#F8FAFC]">{r.course_code}</td>
                    <td className="px-3 py-2 text-[12px] text-[#64748B] hidden md:table-cell truncate max-w-[200px]">{r.title}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#94A3B8]">{r.ca_score ?? "—"}</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-[#94A3B8]">{r.exam_score ?? "—"}</td>
                    <td className="px-3 py-2 text-[12px] font-black font-mono text-[#F8FAFC]">{r.total_score ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black border ${gradeBadgeClass(r.letter_grade)}`}>
                        {r.letter_grade ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono font-bold text-[#64748B]">{r.grade_point ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              {gpa && (
                <tfoot>
                  <tr className="bg-[#0A0F1C] border-t border-[#1E293B]">
                    <td colSpan={5} className="px-3 py-3 text-[11px] font-black uppercase tracking-widest text-[#475569]">
                      Semester GPA
                    </td>
                    <td colSpan={2} className="px-3 py-3 text-[16px] font-black text-emerald-400">
                      {gpa}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── SECTION 3: Footer (15%) ── */}
      <div className="shrink-0 h-auto md:h-[15%] bg-[#0A0F1C] border-t border-[#1E293B] px-5 py-4 flex items-center justify-between gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[12px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all no-print"
        >
          <Download className="w-4 h-4" />
          <span>Print / Save PDF</span>
        </button>

        <button
          onClick={handleExport}
          disabled={hasUnreleased || !hasAnyResult}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[12px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed no-print"
        >
          <Download className="w-4 h-4" />
          <span>Export .csv</span>
        </button>
      </div>
    </div>
  );
}
