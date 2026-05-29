"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Printer,
  Download,
  Upload,
  Edit3,
  Save,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
} from "lucide-react";
import UploadModal from "@/components/UploadModal";
import { calculateGrade } from "@/lib/gradingEngine";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Grade computation helper returning {total, grade, point} ────────────────
function computeGrade(ca: number, exam: number) {
  const total = ca + exam;
  const result = calculateGrade(total);
  return { total, grade: result.letterGrade, point: result.gradePoint };
}

// ─── Toast Component ─────────────────────────────────────────────────────────
function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "saving";
  message: string;
  onDismiss: () => void;
}) {
  const colors = {
    success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    error: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    saving: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300",
  };
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 shrink-0" />,
    saving: <Loader2 className="w-4 h-4 animate-spin shrink-0" />,
  };
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-2xl shadow-black/40 text-[13px] font-bold max-w-[90vw] toast-enter ${colors[type]}`}
    >
      {icons[type]}
      <span>{message}</span>
      {type !== "saving" && (
        <button onClick={onDismiss} className="ml-1 opacity-60 hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Release Modal ────────────────────────────────────────────────────────────
function ReleaseModal({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: (password: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [pw, setPw] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0F1524] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-[#F8FAFC]">Release Results</h3>
              <p className="text-[12px] text-[#64748B] font-medium">
                This action will make results visible to students.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-[#94A3B8] leading-relaxed">
            Confirm your account password to authorize the bulk release of this result ledger.
            Once released, students will be able to view their scores.
          </p>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-[#475569]">
              Account Password
            </label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-[#070A12] border border-[#1E293B] text-[13px] font-medium text-[#F8FAFC] placeholder:text-[#334155] rounded-xl px-4 py-3 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-[13px] font-bold text-[#64748B] hover:text-[#94A3B8] hover:bg-[#1E293B] rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(pw)}
            disabled={!pw || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 font-bold text-[13px] rounded-xl transition-all disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            <span>Confirm Release</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultsMatrix() {
  const searchParams = useSearchParams();
  const rawDept = searchParams.get("dept") || "";
  const initCourse = searchParams.get("course") || "";
  const initLevel = searchParams.get("level") || "500L";
  const initSemester = searchParams.get("semester") || "Harmattan";

  // Auth state
  const [userRole, setUserRole] = useState("student");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [allocatedData, setAllocatedData] = useState<any[]>([]);

  const dept = userRole === "hod" && !rawDept ? "IFT" : rawDept;

  // Parameters
  const [level, setLevel] = useState(initLevel);
  const [semester, setSemester] = useState(initSemester);
  const [session, setSession] = useState("2024/2025");
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [courseCode, setCourseCode] = useState(initCourse);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Grid state
  const [rows, setRows] = useState<any[]>([]);
  const [originalRows, setOriginalRows] = useState<any[]>([]);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Save / toast state
  const [toast, setToast] = useState<{ type: "success" | "error" | "saving"; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release state
  const [isReleased, setIsReleased] = useState(false);
  const [releaseModal, setReleaseModal] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const showToast = useCallback((type: "success" | "error" | "saving", message: string, autoDismissMs = 3500) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    if (type !== "saving") {
      toastTimer.current = setTimeout(() => setToast(null), autoDismissMs);
    }
  }, []);

  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  // ── Auth + allocations ──
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

  // ── Fetch courses ──
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
      if (courses.length > 0) {
        setCourseCode((prev) => (courses.find((c) => c.course_code === prev) ? prev : courses[0].course_code));
      } else {
        setCourseCode("");
      }
      setIsLoadingCourses(false);
    };
    fetch();
  }, [dept, level, semester, userRole, isAuthResolved, allocatedData]);

  // ── Fetch grid rows ──
  useEffect(() => {
    if (!courseCode || !dept || isLoadingCourses) {
      setRows([]);
      setOriginalRows([]);
      return;
    }
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

  // ── Cell Edit ──
  const handleCellEdit = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const revertRow = (index: number) => {
    const updated = [...rows];
    updated[index] = JSON.parse(JSON.stringify(originalRows[index]));
    setRows(updated);
  };

  // ── Save row to DB ──
  const saveRowToDB = async (index: number) => {
    const row = rows[index];
    const ca = row.ca_score === "" ? 0 : Number(row.ca_score);
    const ex = row.exam_score === "" ? 0 : Number(row.exam_score);

    if (ca > 40) {
      showToast("error", "CA Score cannot exceed 40 points.");
      revertRow(index);
      return;
    }
    if (ex > 70) {
      showToast("error", "Exam Score cannot exceed 70 points.");
      revertRow(index);
      return;
    }
    if (ca + ex > 100) {
      showToast("error", "Total Score (CA + Exam) cannot exceed 100.");
      revertRow(index);
      return;
    }

    showToast("saving", "Saving to cloud ledger...");
    const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
    if (!selectedCourse) { showToast("error", "No valid course context."); return; }

    const { total, grade, point } = computeGrade(ca, ex);
    const payload = {
      student_id: row.student_id,
      course_id: selectedCourse.id,
      ca_score: ca,
      exam_score: ex,
      total_score: total,
      letter_grade: grade,
      grade_point: point,
      academic_year: session,
      semester,
      status: "draft",
      uploaded_by: userId,
    };

    let error: any;
    if (row.id) {
      const res = await supabase.from("results").update(payload).eq("id", row.id);
      error = res.error;
    } else {
      const res = await supabase.from("results").insert(payload).select().single();
      if (!res.error && res.data) {
        const updated = [...rows];
        updated[index] = { ...updated[index], id: res.data.id };
        setRows(updated);
      }
      error = res.error;
    }

    if (!error) {
      const updated = [...rows];
      updated[index] = { ...updated[index], ca_score: ca, exam_score: ex, total_score: total, letter_grade: grade, grade_point: point };
      setRows(updated);
      const newOriginals = [...originalRows];
      newOriginals[index] = JSON.parse(JSON.stringify(updated[index]));
      setOriginalRows(newOriginals);
      showToast("success", "Row synchronized with cloud ledger.");
    } else {
      const msg = error?.message || error?.details || "Database synchronization error.";
      showToast("error", `Sync Error: ${msg}`);
      revertRow(index);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
      await saveRowToDB(index);
    }
  };

  // ── Batch upload commit ──
  const handleBatchCommit = async (parsedRows: any[]) => {
    showToast("saving", "Committing batch to cloud ledger...");
    const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
    if (!selectedCourse) { showToast("error", "No valid course context."); return; }

    const payload = parsedRows
      .map((parsed) => {
        const studentRow = rows.find((r) => r.reg_number === parsed.reg_number);
        if (!studentRow) return null;
        const { total, grade, point } = computeGrade(parsed.ca_score, parsed.exam_score);
        return {
          ...(studentRow.id ? { id: studentRow.id } : {}),
          student_id: studentRow.student_id,
          course_id: selectedCourse.id,
          ca_score: parsed.ca_score,
          exam_score: parsed.exam_score,
          total_score: total,
          letter_grade: grade,
          grade_point: point,
          academic_year: session,
          semester,
          status: "draft",
          uploaded_by: userId,
        };
      })
      .filter(Boolean);

    if (payload.length > 0) {
      const { error } = await supabase.from("results").upsert(payload as any[], { onConflict: "id" });
      if (error) {
        showToast("error", `Batch Error: ${error.message || "Unknown error."}`);
      } else {
        showToast("success", `${payload.length} records committed to cloud ledger.`);
        // Refresh grid
        const oldL = level;
        setLevel("_REFRESH_");
        setTimeout(() => setLevel(oldL), 60);
      }
    } else {
      showToast("error", "No matching students found for the uploaded records.");
    }
    setUploadOpen(false);
  };

  // ── Release results ──
  const handleRelease = async (password: string) => {
    setIsReleasing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsReleasing(false); return; }

    // Re-authenticate to verify password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (authErr) {
      showToast("error", "Incorrect password. Release aborted.");
      setIsReleasing(false);
      setReleaseModal(false);
      return;
    }

    const selectedCourse = availableCourses.find((c) => c.course_code === courseCode);
    if (!selectedCourse) { setIsReleasing(false); return; }

    const resultIds = rows.filter((r) => r.id).map((r) => r.id);
    const { error } = await supabase
      .from("results")
      .update({ status: "released" })
      .in("id", resultIds);

    if (!error) {
      setIsReleased(true);
      setRows((prev) => prev.map((r) => ({ ...r, status: "released" })));
      showToast("success", "Results released. Students can now view their scores.");
    } else {
      showToast("error", `Release failed: ${error.message}`);
    }
    setIsReleasing(false);
    setReleaseModal(false);
  };

  // ── CSV Export ──
  const handleExport = () => {
    const headers = ["Student Name", "Reg No", "CA", "Exam", "Total", "Grade", "Grade Point"];
    const csvRows = rows.map((r) =>
      [r.name, r.reg_number, r.ca_score, r.exam_score, r.total_score, r.letter_grade, r.grade_point].join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_${courseCode}_${session}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Level options (restricted for lecturers) ──
  const levelOptions = (() => {
    if (userRole === "lecturer" && allocatedData.length > 0) {
      return Array.from(
        new Set(allocatedData.filter((c) => c.department === dept).map((c) => `${c.level}L`))
      );
    }
    return ["100L", "200L", "300L", "400L", "500L"];
  })();

  const semesterOptions = (() => {
    if (userRole === "lecturer" && allocatedData.length > 0) {
      const lvlNum = parseInt(level.replace("L", ""));
      return Array.from(
        new Set(allocatedData.filter((c) => c.department === dept && c.level === lvlNum).map((c) => c.semester))
      );
    }
    return ["Harmattan", "Rain"];
  })();

  // ── Grade badge color ──
  const gradeBadgeClass = (grade: string) => {
    if (grade === "A") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/20";
    if (grade === "B") return "bg-sky-500/20 text-sky-400 border-sky-500/20";
    if (grade === "C") return "bg-amber-500/20 text-amber-400 border-amber-500/20";
    if (grade === "D") return "bg-orange-500/20 text-orange-400 border-orange-500/20";
    if (grade === "F") return "bg-rose-500/20 text-rose-400 border-rose-500/20";
    return "bg-[#1E293B] text-[#475569] border-[#1E293B]";
  };

  const SelectInput = ({ value, onChange, children, disabled }: any) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#0F1524] border border-[#1E293B] text-[12px] font-semibold text-[#F8FAFC] rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed appearance-none cursor-pointer"
    >
      {children}
    </select>
  );

  return (
    <div className="flex flex-col h-screen bg-[#070A12] overflow-hidden">
      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={dismissToast} />}

      {/* Release Modal */}
      {releaseModal && (
        <ReleaseModal
          onConfirm={handleRelease}
          onCancel={() => setReleaseModal(false)}
          isLoading={isReleasing}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCommit={handleBatchCommit}
      />

      {/* ── SECTION 1: Parameter Controls (25%) ── */}
      <div className="shrink-0 h-auto md:h-[25%] bg-[#0A0F1C] border-b border-[#1E293B] px-5 py-4 flex flex-col justify-between gap-4 no-print">
        <div>
          <h2 className="text-[15px] font-black text-[#F8FAFC] tracking-tight">
            {dept || "—"} Result Matrix
          </h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#475569] mt-0.5">
            Parameter Selection
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <SelectInput
              value={level}
              onChange={setLevel}
              disabled={userRole === "lecturer" && allocatedData.length === 0}
            >
              {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
            </SelectInput>

            <SelectInput
              value={semester}
              onChange={setSemester}
              disabled={userRole === "lecturer" && allocatedData.length === 0}
            >
              {semesterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>

            {isStaff && (
              <SelectInput
                value={courseCode}
                onChange={setCourseCode}
                disabled={hasNoCourses}
              >
                {isLoadingCourses ? (
                  <option value="">Loading...</option>
                ) : hasNoCourses ? (
                  <option value="">No Courses</option>
                ) : (
                  availableCourses.map((c) => (
                    <option key={c.id} value={c.course_code}>{c.course_code}</option>
                  ))
                )}
              </SelectInput>
            )}

            <SelectInput value={session} onChange={setSession}>
              <option value="2023/2024">2023/2024</option>
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
            </SelectInput>
          </div>

          {/* Actions */}
          {isStaff && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setUploadOpen(true)}
                disabled={hasNoCourses}
                className="flex items-center gap-2 px-3 py-2 bg-[#0F1524] border border-[#1E293B] hover:border-emerald-500/30 text-[12px] font-bold text-[#94A3B8] hover:text-emerald-400 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                disabled={hasNoCourses || isGridLoading}
                className={`flex items-center gap-2 px-3 py-2 text-[12px] font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isEditing
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                    : "bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[#94A3B8]"
                }`}
              >
                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditing ? "Done Editing" : "Edit Matrix"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: Data Grid (60%) ── */}
      <div className="flex-1 overflow-auto relative" style={{ maxHeight: "60vh" }}>
        {isGridLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-3 text-[13px] font-bold text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span>Loading result matrix...</span>
            </div>
          </div>
        ) : hasNoCourses ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-[#0F1524] border border-[#1E293B] rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-[#334155]" />
            </div>
            <p className="text-[13px] font-medium text-[#475569] max-w-sm leading-relaxed">
              No academic curriculum data found for the selected parameters.
            </p>
          </div>
        ) : rows.length === 0 && !isGridLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#334155] mb-3" />
            <p className="text-[12px] text-[#475569]">Fetching student records...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px] print-white">
            <thead className="sticky top-0 z-20 bg-[#0A0F1C] border-b border-[#1E293B]">
              <tr>
                <th className="sticky left-0 z-30 bg-[#0A0F1C] px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] border-r border-[#1E293B] whitespace-nowrap">
                  Student Name
                </th>
                <th className="sticky left-0 z-30 bg-[#0A0F1C] px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] border-r border-[#1E293B] whitespace-nowrap">
                  Reg. No.
                </th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] w-20">CA</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569] w-20">Exam</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Total</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Grade</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">GPA</th>
                {isEditing && (
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Save</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F1524]">
              {rows.map((row, i) => (
                <tr
                  key={row.student_id}
                  className="hover:bg-[#0F1524]/60 transition-colors group"
                >
                  <td className="sticky left-0 z-10 bg-[#070A12] group-hover:bg-[#0F1524]/60 px-3 py-2 text-[12px] font-bold text-[#F8FAFC] border-r border-[#1E293B] whitespace-nowrap transition-colors">
                    {row.name}
                  </td>
                  <td className="sticky left-0 z-10 bg-[#070A12] group-hover:bg-[#0F1524]/60 px-3 py-2 text-[12px] font-mono font-semibold text-[#94A3B8] border-r border-[#1E293B] whitespace-nowrap transition-colors">
                    {row.reg_number}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={row.ca_score}
                        onChange={(e) => handleCellEdit(i, "ca_score", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 p-2 sm:p-1 text-base sm:text-[12px] bg-emerald-500/10 border-b-2 border-emerald-500 text-[#F8FAFC] font-mono outline-none rounded transition-colors"
                      />
                    ) : (
                      <span className="text-[12px] font-mono text-[#94A3B8]">{row.ca_score}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        max={70}
                        value={row.exam_score}
                        onChange={(e) => handleCellEdit(i, "exam_score", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, i)}
                        className="w-16 p-2 sm:p-1 text-base sm:text-[12px] bg-emerald-500/10 border-b-2 border-emerald-500 text-[#F8FAFC] font-mono outline-none rounded transition-colors"
                      />
                    ) : (
                      <span className="text-[12px] font-mono text-[#94A3B8]">{row.exam_score}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px] font-black font-mono text-[#F8FAFC]">
                    {row.total_score || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black border ${gradeBadgeClass(row.letter_grade)}`}>
                      {row.letter_grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px] font-mono font-bold text-[#64748B]">
                    {row.grade_point ?? "—"}
                  </td>
                  {isEditing && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => saveRowToDB(i)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
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
      <div className="shrink-0 h-auto md:h-[15%] bg-[#0A0F1C] border-t border-[#1E293B] px-5 py-4 flex items-center justify-between gap-3 no-print">
        {/* Left — Print */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[12px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:block">Print Document</span>
        </button>

        {/* Center — Release (Staff only) */}
        {isStaff && (
          <div className="flex-1 flex justify-center">
            {isReleased ? (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-black rounded-xl">
                <Lock className="w-4 h-4" />
                <span>Results Released</span>
              </div>
            ) : (
              <button
                onClick={() => setReleaseModal(true)}
                disabled={!allRowsGraded || hasNoCourses}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[12px] font-black rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Unlock className="w-4 h-4" />
                <span>Release Results</span>
              </button>
            )}
          </div>
        )}

        {/* Right — Export CSV */}
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[12px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:block">Export .csv</span>
        </button>
      </div>
    </div>
  );
}
