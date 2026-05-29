import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, BookOpen, Users, CheckCircle2, ExternalLink } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const DEPARTMENTS = [
  { id: "IFT", name: "DEPARTMENT OF INFORMATION TECHNOLOGY", accent: "border-l-[#15803D]", badge: "bg-[#DCFCE7] text-[#15803D]" },
  { id: "CSC", name: "DEPARTMENT OF COMPUTER SCIENCE", accent: "border-l-sky-500", badge: "bg-sky-50 text-sky-700" },
  { id: "CYB", name: "DEPARTMENT OF CYBERSECURITY", accent: "border-l-violet-500", badge: "bg-violet-50 text-violet-700" },
  { id: "SOE", name: "DEPARTMENT OF SOFTWARE ENGINEERING", accent: "border-l-amber-500", badge: "bg-amber-50 text-amber-700" },
];

const SESSION = "2025/2026";
const ENROLLED = 125;
const COURSES = 40;

export default async function AdminDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: userData } = await supabase
    .from("users")
    .select("role, department")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "dean" && userData?.role !== "hod") redirect("/");

  // With a dept param — hand off to results
  if (params.dept) {
    return redirect(`/results?dept=${params.dept}`);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10">
      <div className="max-w-[1200px] mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#15803D] mb-1.5">
              School of Information & Communication Technology
            </p>
            <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">
              SICT Executive Overview
            </h1>
            <p className="text-[#64748B] text-[13px] font-medium mt-1">
              Academic Session {SESSION} — Ledger Compilation Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse" />
            <span>System Active</span>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.id}
              className={`bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${dept.accent}`}
            >
              <div className="p-6 flex flex-col flex-1 gap-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${dept.badge}`}>
                      {dept.id}
                    </span>
                    <h2 className="text-[14px] font-black text-[#0F172A] tracking-tight leading-tight mt-2">
                      {dept.name}
                    </h2>
                  </div>
                  <Link
                    href={`/results?dept=${dept.id}`}
                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#15803D] hover:text-[#15803D] text-[#64748B] rounded-lg transition-all"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Users, label: "Enrollment", value: ENROLLED, sub: "Students" },
                    { icon: BookOpen, label: "Courses", value: COURSES, sub: "Active Modules" },
                    { icon: TrendingUp, label: "Session", value: SESSION, sub: "Current Track" },
                  ].map(({ icon: Icon, label, value, sub }) => (
                    <div key={label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{label}</span>
                      </div>
                      <div className="text-[16px] font-black text-[#0F172A] leading-tight">{value}</div>
                      <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                      Ledger Compilation Status
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                      <span className="text-[11px] font-black text-[#15803D]">100% Released</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#F0FDF4] border border-[#BBF7D0] rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 bg-[#15803D] rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick-nav strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DEPARTMENTS.map((dept) => (
            <Link
              key={dept.id}
              href={`/results?dept=${dept.id}`}
              className="bg-white border border-[#E2E8F0] hover:border-[#15803D] hover:shadow-sm rounded-xl px-4 py-3 flex items-center justify-between group transition-all"
            >
              <span className={`text-[12px] font-black px-1.5 py-0.5 rounded ${dept.badge}`}>{dept.id}</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#15803D] transition-colors" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
