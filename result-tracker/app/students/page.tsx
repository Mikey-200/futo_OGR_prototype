"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, AlertTriangle, Edit3, Save, Download, X, CheckCircle2 } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StudentRow {
  profile_id: string;
  full_name: string;
  reg_number: string;
  sex: string | null;
  phone_number: string | null;
  current_level: number;
  department: string;
  [key: string]: any;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

export default function StudentsRoster() {
  const searchParams = useSearchParams();
  const deptParam = searchParams.get("dept") || "IFT";

  const [dept, setDept] = useState(deptParam);
  const [levelFilter, setLevelFilter] = useState("all");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [originalStudents, setOriginalStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => setDept(deptParam), [deptParam]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      let query = supabase
        .from("students")
        .select("*")
        .eq("department", dept)
        .order("full_name");

      if (levelFilter !== "all") {
        query = query.eq("current_level", parseInt(levelFilter));
      }

      const { data, error } = await query;
      if (!error && data) {
        setStudents(data);
        setOriginalStudents(JSON.parse(JSON.stringify(data)));
      }
      setIsLoading(false);
    };
    fetch();
  }, [dept, levelFilter]);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCellEdit = (id: string, field: string, value: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.profile_id === id ? { ...s, [field]: value } : s))
    );
  };

  const validateStudent = (student: StudentRow): string | null => {
    if (student.reg_number && !/^\d{11}$/.test(student.reg_number)) {
      return `Reg No for ${student.full_name} must be exactly 11 digits.`;
    }
    if (student.phone_number && !/^\d{11}$/.test(student.phone_number)) {
      return `Phone for ${student.full_name} must be exactly 11 digits.`;
    }
    return null;
  };

  const saveStudent = async (student: StudentRow) => {
    const err = validateStudent(student);
    if (err) { showToast("error", err); return; }

    setSavingId(student.profile_id);
    const { error } = await supabase
      .from("students")
      .update({
        full_name: student.full_name,
        reg_number: student.reg_number,
        sex: student.sex,
        phone_number: student.phone_number,
        current_level: student.current_level,
      })
      .eq("profile_id", student.profile_id);

    if (!error) {
      setOriginalStudents((prev) =>
        prev.map((s) => (s.profile_id === student.profile_id ? JSON.parse(JSON.stringify(student)) : s))
      );
      showToast("success", `${student.full_name} updated.`);
    } else {
      showToast("error", `Save failed: ${error.message}`);
      // Revert
      setStudents((prev) =>
        prev.map((s) =>
          s.profile_id === student.profile_id
            ? JSON.parse(JSON.stringify(originalStudents.find((o) => o.profile_id === s.profile_id) || s))
            : s
        )
      );
    }
    setSavingId(null);
  };

  const handleExport = () => {
    const headers = ["Name", "Reg No", "Level", "Department", "Sex", "Phone"];
    const csvRows = students.map((s) =>
      [`"${s.full_name}"`, s.reg_number, `${s.current_level}L`, s.department, s.sex ?? "", s.phone_number ?? ""].join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_students_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellClass = "px-3 py-2 text-[12px] font-mono";
  const inputClass = "bg-[#070A12] border border-[#1E293B] focus:border-emerald-500/50 text-[12px] font-mono text-[#F8FAFC] rounded-lg px-2 py-1 outline-none transition-all w-full";

  const DEPTS = ["IFT", "CSC", "CYB", "SOE"];
  const LEVELS = ["100", "200", "300", "400", "500"];

  return (
    <div className="flex flex-col h-screen bg-[#070A12] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-2xl text-[13px] font-bold max-w-[90vw] toast-enter ${
          toast.type === "success"
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/15 border-rose-500/30 text-rose-300"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* Header Bar */}
      <div className="shrink-0 bg-[#0A0F1C] border-b border-[#1E293B] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-[15px] font-black text-[#F8FAFC] tracking-tight">Student List</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#475569] mt-0.5">
            Roster Management — {dept}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Dept filter */}
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="bg-[#0F1524] border border-[#1E293B] text-[12px] font-semibold text-[#F8FAFC] rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
          >
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#0F1524] border border-[#1E293B] text-[12px] font-semibold text-[#F8FAFC] rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-3 py-2 text-[12px] font-bold rounded-lg transition-all ${
              isEditing
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "bg-[#0F1524] border border-[#1E293B] text-[#94A3B8]"
            }`}
          >
            {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? "Done Editing" : "Edit List"}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={students.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] text-[12px] font-bold text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-[13px] font-bold text-[#64748B]">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Loading student roster...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <AlertTriangle className="w-8 h-8 text-[#334155]" />
            <p className="text-[13px] text-[#475569]">No students found for the selected filters.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-[#0A0F1C] border-b border-[#1E293B]">
              <tr>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Name</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Reg. No.</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Level</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Sex</th>
                <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Phone Number</th>
                {isEditing && (
                  <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#475569]">Save</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F1524]">
              {students.map((s) => (
                <tr key={s.profile_id} className="hover:bg-[#0F1524]/60 transition-colors">
                  <td className={cellClass + " text-[#F8FAFC] font-bold"}>
                    {isEditing ? (
                      <input
                        value={s.full_name}
                        onChange={(e) => handleCellEdit(s.profile_id, "full_name", e.target.value)}
                        className={inputClass}
                      />
                    ) : s.full_name}
                  </td>
                  <td className={cellClass + " text-[#94A3B8]"}>
                    {isEditing ? (
                      <input
                        value={s.reg_number}
                        maxLength={11}
                        onChange={(e) => handleCellEdit(s.profile_id, "reg_number", e.target.value)}
                        className={inputClass}
                        placeholder="11-digit number"
                      />
                    ) : s.reg_number}
                  </td>
                  <td className={cellClass + " text-[#64748B]"}>
                    {isEditing ? (
                      <select
                        value={s.current_level}
                        onChange={(e) => handleCellEdit(s.profile_id, "current_level", e.target.value)}
                        className="bg-[#070A12] border border-[#1E293B] text-[12px] font-mono text-[#F8FAFC] rounded-lg px-2 py-1 outline-none appearance-none"
                      >
                        {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
                      </select>
                    ) : `${s.current_level}L`}
                  </td>
                  <td className={cellClass + " text-[#64748B]"}>
                    {isEditing ? (
                      <select
                        value={s.sex || ""}
                        onChange={(e) => handleCellEdit(s.profile_id, "sex", e.target.value)}
                        className="bg-[#070A12] border border-[#1E293B] text-[12px] font-mono text-[#F8FAFC] rounded-lg px-2 py-1 outline-none appearance-none"
                      >
                        <option value="">—</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    ) : (s.sex || "—")}
                  </td>
                  <td className={cellClass + " text-[#64748B]"}>
                    {isEditing ? (
                      <input
                        value={s.phone_number || ""}
                        maxLength={11}
                        onChange={(e) => handleCellEdit(s.profile_id, "phone_number", e.target.value)}
                        className={inputClass}
                        placeholder="11-digit number"
                      />
                    ) : (s.phone_number || "—")}
                  </td>
                  {isEditing && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => saveStudent(s)}
                        disabled={savingId === s.profile_id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg transition-all disabled:opacity-40"
                      >
                        {savingId === s.profile_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
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

      {/* Footer */}
      <div className="shrink-0 bg-[#0A0F1C] border-t border-[#1E293B] px-5 py-3 flex items-center justify-between no-print">
        <p className="text-[11px] text-[#475569] font-medium">
          {students.length} student{students.length !== 1 ? "s" : ""} in roster
        </p>
        <button
          onClick={() => window.print()}
          className="text-[11px] font-bold text-[#475569] hover:text-[#94A3B8] transition-colors"
        >
          Print Roster
        </button>
      </div>
    </div>
  );
}
