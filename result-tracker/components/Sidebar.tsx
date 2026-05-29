"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  ChevronDown, ChevronRight, LogOut, Menu, X, BookMarked,
} from "lucide-react";

interface SidebarUser {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  school?: string;
  department?: string;
  assigned_courses?: string[];
  allocations?: any[];
}

const SICT_DEPARTMENTS = [
  { id: "IFT", label: "Information Technology" },
  { id: "CSC", label: "Computer Science" },
  { id: "CYB", label: "Cybersecurity" },
  { id: "SOE", label: "Software Engineering" },
];

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (pathname === "/") return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const getDisplayName = () => {
    if (!user.full_name) return user.email;
    if (user.role === "student") {
      return user.full_name.split(" ").slice(0, 2).join(" ");
    }
    return user.full_name;
  };

  // ── Nav link component ──
  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname.startsWith(href) && href !== "/" ||
      pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
          isActive
            ? "bg-[#DCFCE7] text-[#15803D] font-bold"
            : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#15803D]" : "text-[#94A3B8]"}`} />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-3 pt-5 pb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#94A3B8]">
      {label}
    </div>
  );

  // ── Role-specific navigation ──
  const DeanNav = () => (
    <div className="space-y-0.5">
      <NavLink href="/admin" icon={LayoutDashboard} label="SICT Overview" />
      <SectionLabel label="Departments" />
      {SICT_DEPARTMENTS.map((dept) => (
        <div key={dept.id}>
          <div className={`flex items-center justify-between rounded-lg transition-all cursor-pointer ${
            expandedDept === dept.id ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
          }`}>
            <Link
              href={`/results?dept=${dept.id}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 flex-1 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0 text-[#94A3B8]" />
              <span className="font-bold">{dept.id}</span>
              <span className="text-[#94A3B8] font-normal hidden xl:block truncate">— {dept.label}</span>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                setExpandedDept(expandedDept === dept.id ? null : dept.id);
              }}
              className="px-2 py-2 text-[#CBD5E1] hover:text-[#64748B] transition-colors"
            >
              {expandedDept === dept.id
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
          {expandedDept === dept.id && (
            <div className="ml-4 pl-3 border-l-2 border-[#E2E8F0] my-1">
              <Link
                href={`/students?dept=${dept.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2 text-[12px] font-semibold text-[#64748B] hover:text-[#15803D] transition-colors rounded"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Students Roster</span>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const HODNav = () => (
    <div className="space-y-0.5">
      <NavLink href={`/results?dept=${user.department || "IFT"}`} icon={LayoutDashboard} label="Result Matrix" />
      <SectionLabel label="Department" />
      <NavLink href={`/results?dept=${user.department || "IFT"}`} icon={BookOpen} label={`${user.department || "Dept"} Ledger`} />
      <NavLink href={`/students?dept=${user.department || "IFT"}`} icon={Users} label="Students Roster" />
    </div>
  );

  const LecturerNav = () => {
    const courses = user.allocations || [];
    const depts = Array.from(new Set(courses.map((c: any) => c.department).filter(Boolean))) as string[];
    return (
      <div className="space-y-0.5">
        <NavLink href={`/results?dept=${depts[0] || "IFT"}`} icon={LayoutDashboard} label="Faculty Desk" />
        <SectionLabel label="Assigned Modules" />
        {courses.length === 0
          ? <p className="px-3 py-2 text-[12px] text-[#94A3B8] italic">No allocations assigned</p>
          : courses.map((c: any) => (
              <NavLink
                key={c.id}
                href={`/results?dept=${c.department}&course=${c.course_code}&level=${c.level}L&semester=${c.semester}`}
                icon={BookOpen}
                label={c.course_code}
              />
            ))
        }
        {depts.length > 0 && (
          <>
            <SectionLabel label="Roster" />
            {depts.map((d) => (
              <NavLink key={d} href={`/students?dept=${d}`} icon={Users} label={`${d} Roster`} />
            ))}
          </>
        )}
      </div>
    );
  };

  const StudentNav = () => (
    <div className="space-y-0.5">
      <NavLink href="/student" icon={GraduationCap} label="My Academic Ledger" />
    </div>
  );

  const renderNav = () => {
    switch (user.role) {
      case "dean": return <DeanNav />;
      case "hod": return <HODNav />;
      case "lecturer": return <LecturerNav />;
      case "student": return <StudentNav />;
      default: return null;
    }
  };

  const SidebarBody = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#15803D] rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <BookMarked className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="text-[13px] font-black tracking-wide text-[#0F172A] leading-tight">FUTO Portal</div>
            <div className="text-[10px] font-bold text-[#15803D] tracking-widest uppercase">SICT Ledger Core</div>
          </div>
        </div>
      </div>

      {/* User profile block */}
      <div className="px-4 py-3 border-b border-[#E2E8F0]">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5">
          <p className="text-[13px] font-bold text-[#0F172A] truncate" title={user.full_name || user.email}>
            {getDisplayName()}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest bg-[#15803D] text-white px-1.5 py-0.5 rounded">
              {user.role}
            </span>
            {(user.department || user.school) && (
              <span className="text-[11px] font-medium text-[#64748B] truncate">
                {user.department || user.school}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">{renderNav()}</nav>

      {/* Sign out — pinned bottom */}
      <div className="px-3 py-3 border-t border-[#E2E8F0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#E2E8F0] shadow-sm no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#15803D] rounded-lg flex items-center justify-center">
            <BookMarked className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-black text-[#0F172A]">FUTO Portal</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel — fixed, 260px */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-[260px]
          border-r border-[#E2E8F0] shadow-sm
          transition-transform duration-300 ease-in-out no-print
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <SidebarBody />
      </aside>

      {/* Mobile spacer for top bar */}
      <div className="md:hidden h-[52px] shrink-0" />
    </>
  );
}
