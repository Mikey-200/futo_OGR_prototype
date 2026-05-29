import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, BookOpen, Users, CheckCircle2, ExternalLink } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const DEPARTMENTS = [
  {
    id: "IFT",
    name: "DEPARTMENT OF INFORMATION TECHNOLOGY",
    color: "from-emerald-500/20 to-transparent",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-400",
  },
  {
    id: "CSC",
    name: "DEPARTMENT OF COMPUTER SCIENCE",
    color: "from-sky-500/20 to-transparent",
    borderColor: "border-sky-500/20",
    textColor: "text-sky-400",
  },
  {
    id: "CYB",
    name: "DEPARTMENT OF CYBERSECURITY",
    color: "from-violet-500/20 to-transparent",
    borderColor: "border-violet-500/20",
    textColor: "text-violet-400",
  },
  {
    id: "SOE",
    name: "DEPARTMENT OF SOFTWARE ENGINEERING",
    color: "from-amber-500/20 to-transparent",
    borderColor: "border-amber-500/20",
    textColor: "text-amber-400",
  },
];

const SESSION = "2025/2026";
const ENROLLED = 125;
const COURSES = 40;

export default async function AdminDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: userData } = await supabase
    .from("users")
    .select("role, department")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "dean" && userData?.role !== "hod") {
    redirect("/");
  }

  // If no dept param → show Dean's Overview bento grid
  if (!params.dept) {
    return (
      <div className="min-h-screen bg-[#070A12] p-6 md:p-10">
        <div className="max-w-[1300px] mx-auto space-y-8">

          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400/70 mb-2">
                School of Information & Communication Technology
              </p>
              <h1 className="text-3xl font-black text-[#F8FAFC] tracking-tight">
                SICT Executive Overview
              </h1>
              <p className="text-[#64748B] text-[13px] font-medium mt-1">
                Academic Session {SESSION} — Ledger Compilation Dashboard
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Active</span>
            </div>
          </header>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.id}
                className={`bg-[#0F1524] border border-[#1E293B] rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:border-[#334155] hover:shadow-2xl hover:shadow-black/40`}
              >
                {/* Top gradient strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${dept.color}`} />

                <div className="p-6 flex flex-col flex-1 gap-5">
                  {/* Dept Title */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.15em] ${dept.textColor} mb-1.5`}>
                        {dept.id}
                      </div>
                      <h2 className="text-[14px] font-black text-[#F8FAFC] tracking-tight leading-tight">
                        {dept.name}
                      </h2>
                    </div>
                    <Link
                      href={`/results?dept=${dept.id}`}
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#263348] ${dept.textColor} transition-colors`}
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#070A12] border border-[#1E293B] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Users className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                          Enrolled
                        </span>
                      </div>
                      <div className="text-xl font-black text-[#F8FAFC]">{ENROLLED}</div>
                      <div className="text-[10px] text-[#475569] font-medium mt-0.5">
                        Active Students
                      </div>
                    </div>

                    <div className="bg-[#070A12] border border-[#1E293B] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                          Courses
                        </span>
                      </div>
                      <div className="text-xl font-black text-[#F8FAFC]">{COURSES}</div>
                      <div className="text-[10px] text-[#475569] font-medium mt-0.5">
                        Active Modules
                      </div>
                    </div>

                    <div className="bg-[#070A12] border border-[#1E293B] rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#475569]" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">
                          Session
                        </span>
                      </div>
                      <div className="text-[13px] font-black text-[#F8FAFC]">{SESSION}</div>
                      <div className="text-[10px] text-[#475569] font-medium mt-0.5">
                        Current Track
                      </div>
                    </div>
                  </div>

                  {/* Progress bar & Ledger State */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] font-bold text-[#475569] uppercase tracking-widest">
                        Ledger Compilation Status
                      </span>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${dept.textColor}`} />
                        <span className={`text-[11px] font-black ${dept.textColor}`}>
                          100% Released
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#070A12] rounded-full h-1.5 overflow-hidden border border-[#1E293B]">
                      <div
                        className={`h-1.5 rounded-full bg-gradient-to-r ${dept.color} shadow-lg`}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Nav Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEPARTMENTS.map((dept) => (
              <Link
                key={dept.id}
                href={`/results?dept=${dept.id}`}
                className="bg-[#0F1524] border border-[#1E293B] hover:border-[#334155] rounded-xl px-4 py-3 flex items-center justify-between group transition-all duration-150"
              >
                <span className={`text-[12px] font-black ${dept.textColor}`}>{dept.id}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#334155] group-hover:text-[#94A3B8] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dept-filtered view → redirect to /results
  return redirect(`/results?dept=${params.dept}`);
}
