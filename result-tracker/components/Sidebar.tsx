"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/types";
import { Menu, X, LogOut, LayoutDashboard, Users, ChevronDown, ChevronRight, BookOpen, GraduationCap } from "lucide-react";

interface SidebarProps {
  user: {
    email: string;
    role: UserRole;
    full_name?: string;
    school?: string;
    department?: string;
    assigned_courses?: string[];
  };
}

const SICT_DEPARTMENTS = [
  { id: 'IFT', name: 'Information Technology' },
  { id: 'CSC', name: 'Computer Science' },
  { id: 'CYB', name: 'Cybersecurity' },
  { id: 'SOE', name: 'Software Engineering' },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  // Do not render sidebar on landing page
  if (pathname === "/") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  const getDisplayName = () => {
    if (!user.full_name) return user.email;
    if (user.role === 'student') {
      const names = user.full_name.split(' ');
      return names.slice(0, 2).join(' '); // Truncate to first two names
    }
    return user.full_name;
  };

  const NavItem = ({ href, icon: Icon, label, isActive }: { href: string, icon: any, label: string, isActive?: boolean }) => {
    const active = isActive !== undefined ? isActive : pathname === href;
    return (
      <Link 
        href={href} 
        onClick={() => setIsOpen(false)}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
          active 
            ? 'bg-[#e6f2eb] text-[#0d5c2e] shadow-sm border border-[#0d5c2e]/20' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-[#0d5c2e]' : 'text-slate-500'}`} />
        <span>{label}</span>
      </Link>
    );
  };

  const DeanNav = () => (
    <div className="space-y-1">
      <NavItem href="/admin" icon={LayoutDashboard} label="SICT Overview" />
      <div className="pt-4 pb-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Departments</div>
      {SICT_DEPARTMENTS.map(dept => (
        <div key={dept.id} className="mb-1">
          <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-100 rounded-lg group cursor-pointer">
            <Link href={`/results?dept=${dept.id}`} className="flex-1 font-semibold text-slate-700 group-hover:text-slate-900" onClick={() => setIsOpen(false)}>
              {dept.id}
            </Link>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setExpandedDept(expandedDept === dept.id ? null : dept.id);
              }}
              className="p-1 text-slate-400 hover:bg-slate-200 rounded"
            >
              {expandedDept === dept.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
          {expandedDept === dept.id && (
            <div className="ml-8 mt-1 border-l-2 border-slate-100 pl-3">
              <Link 
                href={`/students?dept=${dept.id}`}
                onClick={() => setIsOpen(false)} 
                className="flex items-center space-x-2 py-2 text-sm font-medium text-slate-600 hover:text-[#0d5c2e]"
              >
                <Users className="w-4 h-4" />
                <span>Students Roster</span>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const HODNav = () => (
    <div className="space-y-2">
      <NavItem href={`/results?dept=${user.department || 'IFT'}`} icon={LayoutDashboard} label="Dashboard" />
      <div className="pt-4 pb-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Department Control</div>
      <NavItem href={`/results?dept=${user.department || 'IFT'}`} icon={BookOpen} label={`${user.department || 'Dept'} Ledger`} />
      <NavItem href={`/students?dept=${user.department || 'IFT'}`} icon={Users} label="Students Roster" />
    </div>
  );

  const LecturerNav = () => {
    // If multiple departments assigned, we can make Students a dropdown. 
    // Assuming user.department stores the primary or comma separated for now.
    const depts = user.department ? user.department.split(',').map(d => d.trim()) : [];
    
    return (
      <div className="space-y-2">
        <NavItem href={`/results?dept=${depts[0] || 'IFT'}`} icon={LayoutDashboard} label="Faculty Desk" />
        <div className="pt-4 pb-2 px-4 text-xs font-black uppercase tracking-widest text-slate-400">Assigned Portals</div>
        {depts.map(dept => (
          <NavItem key={dept} href={`/results?dept=${dept}`} icon={BookOpen} label={`${dept} Results`} />
        ))}
        {depts.length > 1 ? (
          <div className="pt-2">
            <button 
              onClick={() => setExpandedDept(expandedDept === 'students' ? null : 'students')}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 rounded-lg font-semibold text-slate-600"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-slate-500" />
                <span>Students</span>
              </div>
              {expandedDept === 'students' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedDept === 'students' && (
              <div className="ml-10 mt-1 space-y-1">
                {depts.map(dept => (
                  <Link key={dept} href={`/students?dept=${dept}`} onClick={() => setIsOpen(false)} className="block py-2 text-sm font-medium text-slate-600 hover:text-[#0d5c2e]">
                    {dept} Roster
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <NavItem href={`/students?dept=${depts[0] || ''}`} icon={Users} label="Students Roster" />
        )}
      </div>
    );
  };

  const StudentNav = () => (
    <div className="space-y-2">
      <NavItem href="/student" icon={GraduationCap} label="Academic Ledger" />
    </div>
  );

  const renderNavLinks = () => {
    switch (user.role) {
      case 'dean': return <DeanNav />;
      case 'hod': return <HODNav />;
      case 'lecturer': return <LecturerNav />;
      case 'student': return <StudentNav />;
      default: return null;
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-[#0d5c2e] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-black text-sm">F</span>
          </div>
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">FUTO Portal</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl print:hidden transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded bg-[#0d5c2e] flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-black text-xl">F</span>
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900">FUTO Portal</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0d5c2e]">SICT Ledger Core</p>
              </div>
            </div>

            {/* Profile Block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h2 className="text-base font-bold text-slate-900 truncate" title={user.full_name || user.email}>
                {getDisplayName()}
              </h2>
              <div className="mt-1 flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[#0d5c2e] text-white">
                  {user.role}
                </span>
                {(user.department || user.school) && (
                  <span className="text-xs font-semibold text-slate-500 truncate">
                    {user.department ? `${user.department}` : user.school}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 bg-white">
            {renderNavLinks()}
          </nav>
        </div>

        {/* Pinned Sign Out */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 space-x-3 text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 group"
          >
            <LogOut className="w-5 h-5 text-rose-500 group-hover:text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
