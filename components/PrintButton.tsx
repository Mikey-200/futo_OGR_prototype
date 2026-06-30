"use client";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-700 transition"
    >
      <Printer size={18} />
      <span>Print / Export OGR</span>
    </button>
  );
}
