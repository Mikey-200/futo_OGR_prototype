"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shield, BookOpen, AlertCircle, Loader2, UserCircle2 } from "lucide-react";
import { UserRole } from "@/types";

export default function LandingGateway() {
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Authentication failed: No user returned");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (userError) throw new Error("Failed to retrieve user role.");
      if (!userData) throw new Error("User record not found in system.");

      if (userData.role !== role) {
        // Warning log, but proceed anyway for robust flow, or block it. 
        // We will strictly enforce routing based on the DB role, not the selected dropdown, 
        // but the dropdown is for UI context.
      }

      router.refresh();

      // Route based strictly on DB verified role
      switch (userData.role) {
        case "dean":
          router.push("/results?dept=IFT");
          break;
        case "hod":
          router.push("/results?dept=IFT"); // Or dynamic based on department
          break;
        case "lecturer":
          router.push("/results");
          break;
        case "student":
          router.push("/student");
          break;
        default:
          throw new Error("Invalid user role assigned.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch(role) {
      case "dean": return "dean.sict@futo.edu.ng";
      case "hod": return "hod.ift@futo.edu.ng";
      case "lecturer": return "lecturer.name@futo.edu.ng";
      case "student": return "20201234567@futo.edu.ng";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Branding Panel (Left Side) */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0d5c2e] p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="text-[#0d5c2e] w-6 h-6" />
            </div>
            <span className="text-white text-xl font-black tracking-widest uppercase">FUTO</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Institutional<br/>Grade Portal
          </h1>
          <p className="text-[#e6f2eb] text-lg font-medium max-w-md leading-relaxed">
            A unified system for students, faculty, and administrators to seamlessly manage and track academic progression.
          </p>
        </div>

        <div className="relative z-10 text-[#a3d4b6] text-sm font-semibold">
          &copy; {new Date().getFullYear()} Federal University of Technology Owerri.
        </div>
      </div>

      {/* Authentication Form (Right Side) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f0f9f4] mb-6 md:hidden">
              <BookOpen className="w-6 h-6 text-[#0d5c2e]" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Secure Sign In</h2>
            <p className="text-sm font-semibold text-slate-500 mt-2">Specify your access category and credentials.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Role Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Access Category
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#0d5c2e] focus:ring-2 focus:ring-[#e6f2eb] transition outline-none cursor-pointer"
                >
                  <option value="student">Student Ledger Access</option>
                  <option value="lecturer">Lecturer / Faculty</option>
                  <option value="hod">Head of Department (HOD)</option>
                  <option value="dean">Dean of School</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <UserCircle2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Institutional Email / ID
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-[#0d5c2e] focus:ring-2 focus:ring-[#e6f2eb] transition outline-none" 
                placeholder={getPlaceholder()}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <a href="#" className="text-[11px] font-bold text-[#0d5c2e] hover:underline">Forgot password?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-[#0d5c2e] focus:ring-2 focus:ring-[#e6f2eb] transition outline-none" 
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 bg-[#0d5c2e] text-white rounded-lg py-3.5 font-bold hover:bg-[#0a4a25] transition disabled:opacity-70 shadow-sm mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Authorize Access</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-xs text-center font-medium text-slate-500">
              By signing in, you agree to the <a href="#" className="text-[#0d5c2e] hover:underline">Terms of Service</a> and <a href="#" className="text-[#0d5c2e] hover:underline">Privacy Policy</a> of the university.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
