"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Printer, Download, Upload, Edit3, Save,
  Lock, Unlock, AlertTriangle, Loader2, CheckCircle2, X, ShieldCheck,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import { calculateGrade } from "@/lib/gradingEngine";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function computeGrade(ca: number, exam: number) {
  const total = ca + exam;
  const { letterGrade, gradePoint } = calculateGrade(total);
  return { total, grade: letterGrade, point: gradePoint };
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ type, message, onDismiss }: {
  type: "success" | "error" | "saving";
  message: string;
  onDismiss: () => void;
}) {
  const styles = {
    success: "bg-[#F0FDF4] border-[#86EFAC] text-[#15803D]",
    error: "bg-rose-50 border-rose-200 text-rose-700",
    saving: "bg-blue-50 border-blue-200 text-blue-700",
  };
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 shrink-0" />,
    saving: <Loader2 className="w-4 h-4 animate-spin shrink-0" />,
  };
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-lg text-[13px] font-bold max-w-[90vw] toast-enter ${styles[type]}`}>
      {icons[type]}
      <span>{message}</span>
      {type !== "saving" && (
        <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Release Password Modal ────────────────────────────────────────────────────
function ReleaseModal({ onConfirm, onCancel, isLoading }: {
  onConfirm: (pw: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/30 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-[#0F172A]">Release Results</h3>
            <p className="text-[12px] text-[#64748B]">This will make results visible to students.</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-[#475569] leading-relaxed">
            Confirm your account password to authorize the release of this result ledger. Once released, students will be able to view their scores immediately.
          </p>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-[#475569]">
              Account Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] font-medium text-[#0F172A] rounded-xl px-4 py-3 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(pw)}
            disabled={!pw || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-bold text-[13px] rounded-xl transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            <span>Confirm Release</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ResultsMatrix() {
  const searchParams = useSearchParams();
  const rawDept = searchParams.get("dept") || "";
  const initCourse = searchParams.get("course") || "";
  const initLevel = searchParams.get("level") || "500L";
  const initSemester = searchParams.get("semester") || "Harmattan";

  // Auth
  const [userRole, setUserRole] = useState("student");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [allocatedData, setAllocatedData] = useState<any[]>([]);

  const dept = userRole === "hod" && !rawDept ? "IFT" : rawDept;

  // Params
  const [level, setLevel] = useState(initLevel);
  const [semester, setSemester] = useState(initSemester);
  const [session, setSession] = useState("2024/2025");
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [courseCode, setCourseCode] = useState(initCourse);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Grid
  const [rows, setRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "saving"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release
  const [isReleased, setIsReleased] = useState(false);
  const [releaseModal, setReleaseModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const showToast = useCallback((type: "success" | "error" | "saving", message: string, ms = 3500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    if (type !== "saving") toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  // ── Auth ──
  useEffect(() => {
    const resolve = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        setUserId(s.user.id);
        setUserEmail(s.user.email || "");
        const { data } = await supabase.from("users").select("role").eq("id", s.user.id).single();
        const role = data?.role || "student";
        setUserRole(role);
        if (role === "lecturer") {
          const { data: alloc } = await supabase
            .from("lecturer_allocations")
            .select("courses(*)")
            .eq("lecturer_id", s.user.id);
          if (alloc) setAllocatedData(alloc.map((a: any) => a.courses).filter(Boolean));
        }
      }
      setIsAuthResolved(true);
    };
    resolve();
  }, []);

  // ── Course fetch ──
  useEffect(() => {
    if (!isAuthResolved || !dept) return;
    const fetch = async () => {
      setIsLoadingCourses(true);
      const lvlNum = parseInt(level.replace("L", ""));
      let courses: any[] = [];

      if (userRole === "lecturer" && allocatedData.length > 0) {
        courses = allocatedData.filter(
          (c: any) => c.department === dept && c.level === lvlNum && c.semester === semester
        );
      } else if (userRole !== "lecturer") {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("department", dept)
          .eq("level", lvlNum)
          .eq("semester", semester);
        if (data) courses = data;
      }

      setAvailableCourses(courses);
      setCourseCode((prev) => (courses.find((c) => c.course_code === prev) ? prev : courses[0]?.course_code || ""));
      setIsLoadingCourses(false);
    };
    fetch();
  }, [dept, level, semester, userRole, isAuthResolved, allocatedData]);

  // ── Matrix fetch ──
  useEffect(() => {
    if (!courseCode || !dept || isLoadingCourses) { setRows([]); setOriginalRows([]); return; }
    const fetchMatrix = async () => {
      setIsGridLoading(true);
      const lvlNum = parseInt(level.replace("L", ""));
      const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
      if (!selectedCourse) { setIsGridLoading(false); return; }

      const [{ data: students }, { data: results }] = await Promise.all([
        supabase.from("students").select("*").eq("department", dept).eq("current_level", lvlNum).order("full_name"),
        supabase.from("results").select("*").eq("course_id", selectedCourse.id).eq("academic_year", session),
      ]);

      if (!students) { setIsGridLoading(false); return; }

      const merged = students.map((s) => {
        const r = results?.find((res) => res.student_id === s.profile_id);
        return {
          id: r?.id || null,
          student_id: s.profile_id,
          name: s.full_name,
          reg_number: s.reg_number,
          ca_score: r?.ca_score ?? "",
          exam_score: r?.exam_score ?? "",
          total_score: r?.total_score ?? 0,
          letter_grade: r?.letter_grade ?? "-",
          grade_point: r?.grade_point ?? 0,
          status: r?.status ?? "draft",
        };
      });

      setRows(merged);
      setOriginalRows(JSON.parse(JSON.stringify(merged)));
      setIsReleased(merged.length > 0 && merged.every((r) => r.status === "released"));
      setIsGridLoading(false);
    };
    fetchMatrix();
  }, [courseCode, dept, level, session, isLoadingCourses, availableCourses]);

  const isStaff = userRole !== "student";
  const hasNoCourses = availableCourses.length === 0 && !isLoadingCourses;
  const allRowsGraded = rows.length > 0 && rows.every((r) => r.letter_grade !== "-");

  const handleCellEdit = (i: number, field: string, value: string) => {
    const updated = [...rows];
    updated[i] = { ...updated[i], [field]: value };
    setRows(updated);
  };

  const revertRow = (i: number) => {
    const updated = [...rows];
    updated[i] = JSON.parse(JSON.stringify(originalRows[i]));
    setRows(updated);
  };

  const saveRowToDB = async (i: number) => {
    const row = rows[i];
    const ca = row.ca_score === "" ? 0 : Number(row.ca_score);
    const ex = row.exam_score === "" ? 0 : Number(row.exam_score);

    if (ca > 40) { showToast("error", "CA Score cannot exceed 40 points."); revertRow(i); return; }
    if (ex > 70) { showToast("error", "Exam Score cannot exceed 70 points."); revertRow(i); return; }
    if (ca + ex > 100) { showToast("error", "Total (CA + Exam) cannot exceed 100."); revertRow(i); return; }

    showToast("saving", "Saving to cloud ledger...");
    const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
    if (!selectedCourse) { showToast("error", "No valid course context."); return; }

    const { total, grade, point } = computeGrade(ca, ex);
    const payload = {
      student_id: row.student_id, course_id: selectedCourse.id,
      ca_score: ca, exam_score: ex, total_score: total,
      letter_grade: grade, grade_point: point,
      academic_year: session, semester, status: "draft", uploaded_by: userId,
    };

    let error: any;
    if (row.id) {
      const res = await supabase.from("results").update(payload).eq("id", row.id);
      error = res.error;
    } else {
      const res = await supabase.from("results").insert(payload).select().single();
      if (!res.error && res.data) {
        const updated = [...rows];
        updated[i] = { ...updated[i], id: res.data.id };
        setRows(updated);
      }
      error = res.error;
    }

    if (!error) {
      const updated = [...rows];
      updated[i] = { ...updated[i], ca_score: ca, exam_score: ex, total_score: total, letter_grade: grade, grade_point: point };
      setRows(updated);
      const newOrig = [...originalRows];
      newOrig[i] = JSON.parse(JSON.stringify(updated[i]));
      setOriginalRows(newOrig);
      showToast("success", "Row synchronized with cloud ledger.");
    } else {
      showToast("error", `Sync Error: ${error?.message || "Unknown error."}`);
      revertRow(i);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); await saveRowToDB(i); }
  };

  const handleBatchCommit = async (parsedRows: any[]) => {
    showToast("saving", "Committing batch to cloud ledger...");
    const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
    if (!selectedCourse) { showToast("error", "No valid course context."); return; }

    const payload = parsedRows.map((parsed) => {
      const sr = rows.find((r) => r.reg_number === parsed.reg_number);
      if (!sr) return null;
      const { total, grade, point } = computeGrade(parsed.ca_score, parsed.exam_score);
      return {
        ...(sr.id ? { id: sr.id } : {}),
        student_id: sr.student_id, course_id: selectedCourse.id,
        ca_score: parsed.ca_score, exam_score: parsed.exam_score,
        total_score: total, letter_grade: grade, grade_point: point,
        academic_year: session, semester, status: "draft", uploaded_by: userId,
      };
    }).filter(Boolean);

    if (payload.length > 0) {
      const { error } = await supabase.from("results").upsert(payload as any[], { onConflict: "id" });
      if (error) {
        showToast("error", `Batch Error: ${error.message}`);
      } else {
        showToast("success", `${payload.length} records committed to cloud ledger.`);
        const old = level;
        setLevel("_RESET_");
        setTimeout(() => setLevel(old), 60);
      }
    } else {
      showToast("error", "No matching students found in the current grid.");
    }
    setUploadOpen(false);
  };

  const handleRelease = async (password: string) => {
    setIsReleasing(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: userEmail, password });
    if (authErr) {
      showToast("error", "Incorrect password — release aborted.");
      setIsReleasing(false);
      setReleaseModal(false);
      return;
    }
    const ids = rows.filter((r) => r.id).map((r) => r.id);
    const { error } = await supabase.from("results").update({ status: "released" }).in("id", ids);
    if (!error) {
      setIsReleased(true);
      setRows((prev) => prev.map((r) => ({ ...r, status: "released" })));
      showToast("success", "Results released — students can now view their scores.");
    } else {
      showToast("error", `Release failed: ${error.message}`);
    }
    setIsReleasing(false);
    setReleaseModal(false);
  };

  const handleExport = () => {
    const csv = [
      ["Student Name", "Reg No", "CA", "Exam", "Total", "Grade", "Grade Point", "Status"].join(","),
      ...rows.map((r) => [
        `"${r.name}"`, r.reg_number, r.ca_score, r.exam_score,
        r.total_score, r.letter_grade, r.grade_point, r.status,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_${courseCode}_${session}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const levelOptions = userRole === "lecturer" && allocatedData.length > 0
    ? Array.from(new Set(allocatedData.filter((c) => c.department === dept).map((c) => `${c.level}L`)))
    : ["100L", "200L", "300L", "400L", "500L"];

  const semesterOptions = userRole === "lecturer" && allocatedData.length > 0
    ? Array.from(new Set(
        allocatedData
          .filter((c) => c.department === dept && c.level === parseInt(level.replace("L", "")))
          .map((c) => c.semester)
      ))
    : ["Harmattan", "Rain"];

  const gradeBadge = (g: string) => {
    if (g === "A") return "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]";
    if (g === "B") return "bg-sky-50 text-sky-700 border-sky-200";
    if (g === "C") return "bg-amber-50 text-amber-700 border-amber-200";
    if (g === "D") return "bg-orange-50 text-orange-700 border-orange-200";
    if (g === "F") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-[#F8FAFC] text-[#94A3B8] border-[#E2E8F0]";
  };

  const Select = ({ value, onChange, disabled, children }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] rounded-lg px-3 py-2 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 transition-all disabled:opacity-40 appearance-none cursor-pointer shadow-sm"
    >
      {children}
    </select>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">

      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
      {releaseModal && <ReleaseModal onConfirm={handleRelease} onCancel={() => setReleaseModal(false)} isLoading={isReleasing} />}
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onCommit={handleBatchCommit} />

      {/* ── SECTION 1: Parameter Controls (25%) ── */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex flex-col gap-4 shadow-sm no-print" style={{ minHeight: "25%" }}>
        <div>
          <h2 className="text-[15px] font-black text-[#0F172A] tracking-tight">
            {dept || "—"} Result Matrix
          </h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mt-0.5">
            Parameter Selection — {level} · {semester} · {session}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <Select value={level} onChange={setLevel} disabled={userRole === "lecturer" && allocatedData.length === 0}>
              {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>

            <Select value={semester} onChange={setSemester} disabled={userRole === "lecturer" && allocatedData.length === 0}>
              {semesterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>

            {isStaff && (
              <Select value={courseCode} onChange={setCourseCode} disabled={hasNoCourses}>
                {isLoadingCourses
                  ? <option value="">Loading...</option>
                  : hasNoCourses
                  ? <option value="">Not available</option>
                  : availableCourses.map((c) => (
                      <option key={c.id} value={c.course_code}>{c.course_code}</option>
                    ))
                }
              </Select>
            )}

            <Select value={session} onChange={setSession}>
              <option value="2023/2024">2023/2024</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </Select>
          </div>

          {isStaff && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setUploadOpen(true)}
                disabled={hasNoCourses}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] hover:border-[#15803D] hover:text-[#15803D] text-[13px] font-bold text-[#64748B] rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                disabled={hasNoCourses || isGridLoading}
                className={`flex items-center gap-2 px-3 py-2 text-[13px] font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isEditing
                    ? "bg-amber-50 border border-amber-200 text-amber-700"
                    : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#15803D] hover:text-[#15803D]"
                }`}
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                <span>{isEditing ? "Done Editing" : "Edit Matrix"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Data Grid (60%) ── */}
      <div className="flex-1 overflow-auto relative bg-[#F8FAFC]" style={{ maxHeight: "60vh" }}>
        {isGridLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex items-center gap-3 text-[13px] font-bold text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin text-[#15803D]" />
              <span>Loading result matrix...</span>
            </div>
          </div>
        ) : hasNoCourses ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-[#CBD5E1]" />
            </div>
            <p className="text-[13px] font-medium text-[#94A3B8] max-w-sm leading-relaxed">
              No academic curriculum data found for the selected parameters. No courses are available.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px] bg-white print-white">
            <thead className="sticky top-0 z-20 bg-white border-b border-[#E2E8F0] shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-white px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border-r border-[#E2E8F0] whitespace-nowrap">
                  Student Name
                </th>
                <th className="sticky left-0 z-30 bg-white px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] border-r border-[#E2E8F0] whitespace-nowrap">
                  Reg. No.
                </th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] w-20">CA</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8] w-20">Exam</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Total</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Grade</th>
                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Grade Point</th>
                {isEditing && <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Save</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {rows.map((row, i) => (
                <tr key={row.student_id} className="hover:bg-[#F8FAFC] transition-colors group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] px-3 py-2 text-[13px] font-bold text-[#0F172A] border-r border-[#E2E8F0] whitespace-nowrap transition-colors cell-mono">
                    {row.name}
                  </td>
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-[#F8FAFC] px-3 py-2 text-[13px] font-semibold text-[#64748B] border-r border-[#E2E8F0] whitespace-nowrap transition-colors cell-mono">
                    {row.reg_number}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number" min={0} max={40}
                        value={row.ca_score}
                        onChange={(e) => handleCellEdit(i, "ca_score", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 p-2 sm:p-1 text-base sm:text-[13px] bg-[#F0FDF4] border-b-2 border-[#15803D] text-[#0F172A] font-mono outline-none rounded transition-colors"
                      />
                    ) : (
                      <span className="text-[13px] font-mono text-[#475569]">{row.ca_score}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number" min={0} max={70}
                        value={row.exam_score}
                        onChange={(e) => handleCellEdit(i, "exam_score", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 p-2 sm:p-1 text-base sm:text-[13px] bg-[#F0FDF4] border-b-2 border-[#15803D] text-[#0F172A] font-mono outline-none rounded transition-colors"
                      />
                    ) : (
                      <span className="text-[13px] font-mono text-[#475569]">{row.exam_score}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-black font-mono text-[#0F172A]">{row.total_score || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black border ${gradeBadge(row.letter_grade)}`}>
                      {row.letter_grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono font-bold text-[#94A3B8]">{row.grade_point ?? "—"}</td>
                  {isEditing && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => saveRowToDB(i)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#86EFAC] text-[#15803D] text-[11px] font-bold rounded-lg transition-all"
                      >
                        <Save className="w-3 h-3" /><span>Save</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── SECTION 3: Footer Toolbar (15%) ── */}
      <div className="shrink-0 bg-white border-t border-[#E2E8F0] px-5 py-4 flex items-center justify-between gap-3 shadow-sm no-print" style={{ minHeight: "15%" }}>

        {/* Left — Print */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] rounded-xl shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:block">Print Document</span>
        </button>

        {/* Center — Release Results (Staff only) */}
        {isStaff && (
          <div className="flex-1 flex justify-center">
            {isReleased ? (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-[#F0FDF4] border border-[#86EFAC] text-[#15803D] text-[13px] font-black rounded-xl">
                <Lock className="w-4 h-4" />
                <span>Results Released</span>
              </div>
            ) : (
              <button
                onClick={() => setReleaseModal(true)}
                disabled={!allRowsGraded || hasNoCourses}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-[13px] font-black rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Unlock className="w-4 h-4" />
                <span>Release Results</span>
              </button>
            )}
          </div>
        )}

        {/* Right — Export */}
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#64748B] hover:text-[#0F172A] rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:block">Export .csv</span>
        </button>
      </div>
    </div>
  );
}
