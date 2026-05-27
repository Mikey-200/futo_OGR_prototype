"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Download, Edit3, Save, Loader2, CheckCircle2 } from "lucide-react";

export default function StudentRoster() {
  const searchParams = useSearchParams();
  const dept = searchParams.get('dept') || 'IFT';

  const [level, setLevel] = useState("500L");
  const [isEditing, setIsEditing] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      const levelNum = parseInt(level.replace('L', ''));
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('department', dept)
        .eq('current_level', levelNum)
        .order('full_name', { ascending: true });
      
      if (!error && data) {
        setStudents(data);
      }
      setIsLoading(false);
    };

    fetchStudents();
  }, [dept, level]);

  const handleCellEdit = (index: number, field: string, value: string) => {
    // Exact 11-digit max length constraints
    if (field === 'reg_number' && value.length > 11) return;
    if (field === 'phone_number' && value.length > 11) return;
    
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

  const saveRowToDB = async (student: any) => {
    setIsSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase
      .from('students')
      .update({ 
        full_name: student.full_name,
        reg_number: student.reg_number,
        sex: student.sex,
        phone_number: student.phone_number
      })
      .eq('profile_id', student.profile_id);

    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      console.error("Error updating student:", error);
    }
    
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      saveRowToDB(students[index]);
    }
  };

  const exportToExcel = () => {
    if (students.length === 0) return;
    const csvContent = [
      "Student Name,Reg. No.,Sex,Phone Number",
      ...students.map(s => `"${s.full_name}","${s.reg_number}","${s.sex || ''}","${s.phone_number || ''}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `futo_${dept.toLowerCase()}_student_list.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Toast Notification */}
      <div className={`absolute top-4 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-50 flex items-center space-x-3 px-6 py-3 rounded-full shadow-lg transition-all duration-300 ${
        isSaving ? 'bg-indigo-600 text-white translate-y-0 opacity-100' : 
        saveSuccess ? 'bg-emerald-500 text-white translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      }`}>
        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        <span className="text-sm font-bold tracking-wide">
          {isSaving ? 'Saving changes to core database ledger...' : 'Changes saved successfully!'}
        </span>
      </div>

      {/* Top Section */}
      <div className="bg-white border-b border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{dept} Student Roster</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Identity Management</p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          <select value={level} onChange={e => setLevel(e.target.value)} className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-[#0d5c2e] w-full">
            <option value="100L">100L</option>
            <option value="200L">200L</option>
            <option value="300L">300L</option>
            <option value="400L">400L</option>
            <option value="500L">500L</option>
          </select>

          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center justify-center space-x-2 px-4 py-2 font-bold text-sm rounded-lg transition-colors w-full sm:w-auto ${
              isEditing 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>{isEditing ? 'Done Editing' : 'Edit List'}</span>
          </button>
        </div>
      </div>

      {/* Middle Section: Data Table */}
      <div className="flex-1 overflow-auto bg-slate-50 border-b border-slate-200 relative">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 bg-white shadow-sm z-10">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-1/3">Student Name</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-48">Reg. No.</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-32">Sex</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-48">Phone Number</th>
              {isEditing && <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 w-24">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {students.map((student, i) => (
              <tr key={student.profile_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3 text-sm font-bold text-slate-900">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={student.full_name}
                      onChange={(e) => handleCellEdit(i, 'full_name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-full px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors"
                    />
                  ) : student.full_name}
                </td>
                <td className="px-6 py-3">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={student.reg_number}
                      onChange={(e) => handleCellEdit(i, 'reg_number', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-full px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors font-mono"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-600 font-mono">{student.reg_number}</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {isEditing ? (
                    <select 
                      value={student.sex || 'Male'}
                      onChange={(e) => handleCellEdit(i, 'sex', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-full px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-slate-700">{student.sex || 'Not Set'}</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={student.phone_number || ''}
                      onChange={(e) => handleCellEdit(i, 'phone_number', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className="w-full px-2 py-1 text-sm border-b-2 border-emerald-500 bg-emerald-50 outline-none focus:bg-emerald-100 transition-colors font-mono"
                      placeholder="080..."
                    />
                  ) : (
                    <span className="text-sm font-semibold text-slate-700 font-mono">{student.phone_number || 'N/A'}</span>
                  )}
                </td>
                {isEditing && (
                  <td className="px-6 py-3">
                    <button 
                      onClick={() => saveRowToDB(student)}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded"
                    >
                      Save
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && !isLoading && (
              <tr>
                <td colSpan={isEditing ? 5 : 4} className="px-6 py-12 text-center text-slate-500 font-medium">
                  No students found for this parameter block.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={isEditing ? 5 : 4} className="px-6 py-12 text-center text-slate-500 font-medium">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Section */}
      <div className="w-full flex flex-col sm:flex-row justify-end items-center gap-3 p-4 bg-white border-t border-slate-200 shrink-0">
        <button 
          onClick={exportToExcel} 
          disabled={students.length === 0}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-[#f0f9f4] text-[#0d5c2e] font-bold text-sm rounded-lg hover:bg-[#e6f2eb] border border-[#0d5c2e]/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export Catalog (.csv)</span>
        </button>
      </div>
    </div>
  );
}
