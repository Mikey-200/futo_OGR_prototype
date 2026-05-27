"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const SCHOOLS = ['SICT', 'SEET', 'SOES', 'SOHT', 'SAAT', 'SMAT'];
const DEPARTMENTS: Record<string, string[]> = {
  'SICT': ['IFT', 'CSC', 'CYB', 'SE'],
  'SEET': ['EEE', 'MME', 'CHE', 'CVE', 'FST'],
  // Add others as needed
};
const LEVELS = ['100', '200', '300', '400', '500'];
const SEMESTERS = ['Harmattan', 'Rain'];

export default function AdminFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [school, setSchool] = useState(searchParams.get('school') || 'SICT');
  const [dept, setDept] = useState(searchParams.get('dept') || 'IFT');
  const [level, setLevel] = useState(searchParams.get('level') || '500');
  const [semester, setSemester] = useState(searchParams.get('semester') || 'Harmattan');

  useEffect(() => {
    // If school changes and current dept is not in the new school's list, reset dept
    if (DEPARTMENTS[school] && !DEPARTMENTS[school].includes(dept)) {
      setDept(DEPARTMENTS[school][0]);
    }
  }, [school]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('school', school);
    params.set('dept', dept);
    params.set('level', level);
    params.set('semester', semester);
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 flex flex-wrap gap-4 items-end shadow-sm print:hidden">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">School</label>
        <select 
          value={school} 
          onChange={(e) => setSchool(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
        >
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Department</label>
        <select 
          value={dept} 
          onChange={(e) => setDept(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
        >
          {(DEPARTMENTS[school] || [dept]).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Level</label>
        <select 
          value={level} 
          onChange={(e) => setLevel(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
        >
          {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Semester</label>
        <select 
          value={semester} 
          onChange={(e) => setSemester(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#0d5c2e]/50 focus:ring-2 focus:ring-[#e6f2eb] transition-colors"
        >
          {SEMESTERS.map(s => <option key={s} value={s}>{s} Semester</option>)}
        </select>
      </div>

      <button 
        onClick={handleApplyFilters}
        className="ml-auto bg-[#0d5c2e] hover:bg-[#0a4a25] text-white font-bold py-2 px-6 rounded-lg text-sm shadow-sm transition-all tracking-wide"
      >
        Load Matrix
      </button>
    </div>
  );
}
