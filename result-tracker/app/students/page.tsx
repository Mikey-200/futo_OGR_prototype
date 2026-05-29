"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, AlertTriangle, Edit3, Save, Download, X, CheckCircle2, Printer } from "lucide-react";

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

export default function StudentsRoster() {
  const searchParams = useSearchParams();
  const [dept, setDept] = useState(searchParams.get("dept") || "IFT");
  const [levelFilter, setLevelFilter] = useState("all");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [originalStudents, setOriginalStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      let q = supabase.from("students").select("*").eq("department", dept).order("full_name");
      if (levelFilter !== "all") q = q.eq("current_level", parseInt(levelFilter));
      const { data, error } = await q;
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
    setStudents((prev) => prev.map((s) => s.profile_id === id ? { ...s, [field]: value } : s));
  };

  const validate = (s: StudentRow): string | null => {
    if (s.reg_number && !/^\d{11}$/.test(s.reg_number))
      return `Reg No for ${s.full_name} must be exactly 11 digits.`;
    if (s.phone_number && !/^\d{11}$/.test(s.phone_number))
      return `Phone for ${s.full_name} must be exactly 11 digits.`;
    return null;
  };

  const saveStudent = async (s: StudentRow) => {
    const err = validate(s);
    if (err) { showToast("error", err); return; }
    setSavingId(s.profile_id);
    const { error } = await supabase.from("students").update({
      full_name: s.full_name, reg_number: s.reg_number,
      sex: s.sex, phone_number: s.phone_number, current_level: s.current_level,
    }).eq("profile_id", s.profile_id);
    if (!error) {
      setOriginalStudents((prev) => prev.map((o) => o.profile_id === s.profile_id ? JSON.parse(JSON.stringify(s)) : o));
      showToast("success", `${s.full_name} updated.`);
    } else {
      showToast("error", `Save failed: ${error.message}`);
      setStudents((prev) => prev.map((row) =>
        row.profile_id === s.profile_id
          ? JSON.parse(JSON.stringify(originalStudents.find((o) => o.profile_id === row.profile_id) || row))
          : row
      ));
    }
    setSavingId(null);
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Reg No", "Level", "Department", "Sex", "Phone"].join(","),
      ...students.map((s) => [
        `"${s.full_name}"`, s.reg_number, `${s.current_level}L`,
        s.department, s.sex ?? "", s.phone_number ?? ""
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept}_students_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 text-[13px] font-mono text-[#0F172A] rounded-lg px-2.5 py-1.5 outline-none transition-all w-full";
  const DEPTS = ["IFT", "CSC", "CYB", "SOE"];
  const LEVELS = ["100", "200", "300", "400", "500"];

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-lg text-[13px] font-bold max-w-[90vw] toast-enter ${
          toast.type === "success"
            ? "bg-[#F0FDF4] border-[#86EFAC] text-[#15803D]"
            : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5 opacity-50 hover:opacity-100" /></button>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm no-print">
        <div>
          <h2 className="text-[15px] font-black text-[#0F172A] tracking-tight">Student List</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mt-0.5">
            Roster Management — {dept}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={dept} onChange={(e) => setDept(e.target.value)}
            className="bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] rounded-lg px-3 py-2 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 appearance-none cursor-pointer shadow-sm">
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] rounded-lg px-3 py-2 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 appearance-none cursor-pointer shadow-sm">
            <option value="all">All Levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
          </select>

          <button onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-3 py-2 text-[13px] font-bold rounded-lg shadow-sm transition-all ${
              isEditing
                ? "bg-amber-50 border border-amber-200 text-amber-700"
                : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#15803D] hover:text-[#15803D]"
            }`}>
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? "Done Editing" : "Edit List"}</span>
          </button>

          <button onClick={handleExport} disabled={students.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E2E8F0] hover:border-[#15803D] hover:text-[#15803D] text-[13px] font-bold text-[#64748B] rounded-lg shadow-sm transition-all disabled:opacity-40">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-[13px] font-bold text-[#64748B]">
            <Loader2 className="w-5 h-5 animate-spin text-[#15803D]" />
            <span>Loading student roster...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <AlertTriangle className="w-8 h-8 text-[#CBD5E1]" />
            <p className="text-[13px] text-[#94A3B8]">No students found for the selected filters.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] shadow-sm">
              <tr>
                {["Name", "Reg. No.", "Level", "Sex", "Phone Number", ...(isEditing ? ["Save"] : [])].map((h) => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {students.map((s) => (
                <tr key={s.profile_id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-3 py-2 text-[13px] font-bold text-[#0F172A]">
                    {isEditing
                      ? <input value={s.full_name} onChange={(e) => handleCellEdit(s.profile_id, "full_name", e.target.value)} className={inputClass} />
                      : s.full_name}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#475569]">
                    {isEditing
                      ? <input value={s.reg_number} maxLength={11} onChange={(e) => handleCellEdit(s.profile_id, "reg_number", e.target.value)} className={inputClass} placeholder="11-digit number" />
                      : s.reg_number}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#64748B]">
                    {isEditing
                      ? <select value={s.current_level} onChange={(e) => handleCellEdit(s.profile_id, "current_level", e.target.value)}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] font-mono text-[#0F172A] rounded-lg px-2.5 py-1.5 outline-none appearance-none">
                          {LEVELS.map((l) => <option key={l} value={l}>{l}L</option>)}
                        </select>
                      : `${s.current_level}L`}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#64748B]">
                    {isEditing
                      ? <select value={s.sex || ""} onChange={(e) => handleCellEdit(s.profile_id, "sex", e.target.value)}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] font-mono text-[#0F172A] rounded-lg px-2.5 py-1.5 outline-none appearance-none">
                          <option value="">—</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      : (s.sex || "—")}
                  </td>
                  <td className="px-3 py-2 text-[13px] font-mono text-[#64748B]">
                    {isEditing
                      ? <input value={s.phone_number || ""} maxLength={11} onChange={(e) => handleCellEdit(s.profile_id, "phone_number", e.target.value)} className={inputClass} placeholder="11-digit number" />
                      : (s.phone_number || "—")}
                  </td>
                  {isEditing && (
                    <td className="px-3 py-2">
                      <button onClick={() => saveStudent(s)} disabled={savingId === s.profile_id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#86EFAC] text-[#15803D] text-[11px] font-bold rounded-lg transition-all disabled:opacity-40">
                        {savingId === s.profile_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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
      <div className="shrink-0 bg-white border-t border-[#E2E8F0] px-5 py-3 flex items-center justify-between no-print">
        <p className="text-[11px] text-[#94A3B8] font-medium">
          {students.length} student{students.length !== 1 ? "s" : ""} in roster
        </p>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[11px] font-bold text-[#94A3B8] hover:text-[#0F172A] transition-colors">
          <Printer className="w-3.5 h-3.5" />
          <span>Print Roster</span>
        </button>
      </div>
    </div>
  );
}
