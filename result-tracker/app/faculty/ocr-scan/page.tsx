export default function OCRScanPage() {
  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-3xl mx-auto bg-slate-900/40 backdrop-blur-xl p-10 rounded-xl shadow-2xl border border-slate-800/60 relative z-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 mb-2">OCR Document Scan</h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-8">Upload a scanned image or PDF of a raw paper score sheet. Vision AI will extract the table data.</p>
        
        <div className="border-2 border-dashed border-slate-700/50 bg-slate-950/30 rounded-xl p-16 text-center hover:bg-slate-950/50 hover:border-emerald-500/30 transition-all cursor-pointer group">
          <svg className="mx-auto h-16 w-16 text-slate-500 group-hover:text-emerald-400 transition-colors mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-bold text-slate-300">Click to capture or load imaging asset</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-2">JPG, PNG, or PDF up to 15MB</p>
        </div>

        <div className="mt-8 flex justify-end">
          <button className="bg-emerald-600/90 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] tracking-wide">
            Run AI Extraction Engine
          </button>
        </div>
      </div>
    </div>
  );
}
