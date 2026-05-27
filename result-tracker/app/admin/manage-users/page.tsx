export default function ManageUsersPage() {
  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100">Identity Matrix</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-2">School / Lecturer and Student account verification pool</p>
        </header>

        <div className="bg-slate-900/40 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-800/60 overflow-hidden">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-950/50 border-b border-slate-800/50">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name Profile</th>
                <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Role</th>
                <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Authentication Status</th>
                <th className="px-8 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className="hover:bg-slate-800/20 transition-colors">
                <td className="px-8 py-5 whitespace-nowrap font-bold text-slate-200">John Doe</td>
                <td className="px-8 py-5 whitespace-nowrap text-slate-400 font-medium">School / Lecturer</td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                    Verified
                  </span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap font-bold text-blue-500 hover:text-blue-400 cursor-pointer transition-colors">Modify Access</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
