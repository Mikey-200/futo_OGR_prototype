import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { UploadCloud, ScanLine, FileText, CheckCircle, Clock } from "lucide-react";

export default async function FacultyDashboard() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen p-8 bg-[#f8fafc]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#0d5c2e]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, Lecturer
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-2">
              Manage your assigned modules and track student performance matrices.
            </p>
          </div>
          <div className="relative z-10 mt-6 md:mt-0 flex items-center space-x-2 text-sm font-bold text-[#0d5c2e] bg-[#e6f2eb] px-4 py-2 rounded-lg border border-[#0d5c2e]/20">
            <span className="w-2 h-2 rounded-full bg-[#0d5c2e] animate-pulse"></span>
            <span>Academic Session: 2023/2024</span>
          </div>
        </header>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Modules</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Pending allocation</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Uploads</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Awaiting your action</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
            <div className="p-3 bg-emerald-50 text-[#0d5c2e] rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Published Results</p>
              <p className="text-2xl font-black text-slate-900 mt-1">0</p>
              <p className="text-xs font-medium text-slate-400 mt-1">Synchronized to DB</p>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Action Area (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Quick Actions</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                
                {/* Bulk Upload Card */}
                <Link href="/faculty/bulk-upload" className="group block bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:border-[#0d5c2e]/40 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center mb-6 group-hover:bg-[#f0f9f4] group-hover:border-[#0d5c2e]/20 transition-colors">
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-[#0d5c2e] transition-colors" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-[#0d5c2e] transition-colors">Bulk CSV Upload</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Batch insert student scores via standardized spreadsheet templates for your assigned modules.
                  </p>
                  <div className="mt-6 flex items-center text-[11px] font-bold uppercase tracking-wider text-[#0d5c2e]">
                    Initiate Workflow &rarr;
                  </div>
                </Link>

              </div>
            </div>

            {/* Modules Table */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Assigned Course Modules</h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border border-slate-100 mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Modules</h3>
                  <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                    You have not been assigned any courses for this academic session yet. Contact the department Exam Officer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Area (Right 1 Column) */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* Empty state for activity */}
              <div className="text-center py-6 border-b border-slate-100 pb-8">
                <p className="text-sm font-semibold text-slate-400">No recent uploads detected.</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Resources</h4>
                <a href="#" className="flex items-center text-sm font-semibold text-slate-700 hover:text-[#0d5c2e] transition-colors">
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  Download CSV Template
                </a>
                <a href="#" className="flex items-center text-sm font-semibold text-slate-700 hover:text-[#0d5c2e] transition-colors">
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  Grading Policy Documentation
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
