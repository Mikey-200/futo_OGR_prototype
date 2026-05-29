"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Terminal,
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

interface SidebarProps {
  user: SidebarUser;
}

const SICT_DEPARTMENTS = [
  { id: "IFT", name: "Information Technology" },
  { id: "CSC", name: "Computer Science" },
  { id: "CYB", name: "Cybersecurity" },
  { id: "SOE", name: "Software Engineering" },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Skip sidebar on login page
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "?");

  const NavLink = ({
    href,
    icon: Icon,
    label,
    active,
  }: {
    href: string;
    icon: any;
    label: string;
    active?: boolean;
  }) => {
    const activeState = active !== undefined ? active : pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setIsOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
          activeState
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B]/60"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-3 pt-4 pb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#475569]">
      {label}
    </div>
  );

  const DeanNav = () => (
    <div className="space-y-0.5">
      <NavLink href="/admin" icon={LayoutDashboard} label="SICT Overview" />
      <SectionLabel label="Departments" />
      {SICT_DEPARTMENTS.map((dept) => (
        <div key={dept.id}>
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 group ${
              expandedDept === dept.id ? "bg-[#1E293B]" : "hover:bg-[#1E293B]/60"
            }`}
          >
            <Link
              href={`/results?dept=${dept.id}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 flex-1 text-[13px] font-semibold text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{dept.id}</span>
              <span className="text-[#475569] font-normal hidden xl:block">— {dept.name}</span>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                setExpandedDept(expandedDept === dept.id ? null : dept.id);
              }}
              className="p-1 text-[#475569] hover:text-[#94A3B8] transition-colors rounded"
            >
              {expandedDept === dept.id ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {expandedDept === dept.id && (
            <div className="ml-4 pl-3 border-l border-[#1E293B] mt-0.5 mb-1">
              <Link
                href={`/students?dept=${dept.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2 text-[12px] font-medium text-[#64748B] hover:text-emerald-400 transition-colors rounded"
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
      <NavLink
        href={`/results?dept=${user.department || "IFT"}`}
        icon={LayoutDashboard}
        label="Result Matrix"
      />
      <SectionLabel label="Department" />
      <NavLink
        href={`/results?dept=${user.department || "IFT"}`}
        icon={BookOpen}
        label={`${user.department || "Dept"} Ledger`}
      />
      <NavLink
        href={`/students?dept=${user.department || "IFT"}`}
        icon={Users}
        label="Students Roster"
      />
    </div>
  );

  const LecturerNav = () => {
    const allocatedCourses = user.allocations || [];
    const uniqueDepts = Array.from(
      new Set(allocatedCourses.map((c: any) => c.department).filter(Boolean))
    ) as string[];

    return (
      <div className="space-y-0.5">
        <NavLink
          href={`/results?dept=${uniqueDepts[0] || "IFT"}`}
          icon={LayoutDashboard}
          label="Faculty Desk"
        />
        <SectionLabel label="Assigned Modules" />
        {allocatedCourses.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-[#475569] italic">
            No allocations assigned
          </div>
        ) : (
          allocatedCourses.map((course: any) => (
            <NavLink
              key={course.id}
              href={`/results?dept=${course.department}&course=${course.course_code}&level=${course.level}L&semester=${course.semester}`}
              icon={BookOpen}
              label={`${course.course_code}`}
            />
          ))
        )}
        {uniqueDepts.length > 0 && (
          <>
            <SectionLabel label="Roster" />
            {uniqueDepts.map((dept) => (
              <NavLink
                key={dept}
                href={`/students?dept=${dept}`}
                icon={Users}
                label={`${dept} Roster`}
              />
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
      case "dean":
        return <DeanNav />;
      case "hod":
        return <HODNav />;
      case "lecturer":
        return <LecturerNav />;
      case "student":
        return <StudentNav />;
      default:
        return null;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className="px-4 py-5 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[13px] font-black tracking-widest text-[#F8FAFC] uppercase">
              FUTO Portal
            </div>
            <div className="text-[10px] text-emerald-400/70 font-bold tracking-widest uppercase">
              SICT Ledger Core
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Block */}
      <div className="px-4 py-3 border-b border-[#1E293B]">
        <div className="bg-[#0F1524] border border-[#1E293B] rounded-lg px-3 py-2.5">
          <div className="text-[13px] font-bold text-[#F8FAFC] truncate" title={user.full_name || user.email}>
            {getDisplayName()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
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

      {/* Sign Out — Pinned to bottom */}
      <div className="px-3 py-3 border-t border-[#1E293B]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all duration-150 group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0F1524] border-b border-[#1E293B] no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-500/20 border border-emerald-500/30 rounded flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[13px] font-black tracking-widest uppercase text-[#F8FAFC]">
            FUTO Portal
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded-lg transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-[#0A0F1C] border-r border-[#1E293B] 
          transition-transform duration-300 ease-in-out no-print
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top-bar spacer */}
      <div className="md:hidden h-[52px] shrink-0" />
    </>
  );
}
