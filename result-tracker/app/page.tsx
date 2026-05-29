"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Terminal, Shield, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { UserRole } from "@/types";

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
      if (!authData.user) throw new Error("Authentication failed. No user returned.");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, department")
        .eq("id", authData.user.id)
        .single();

      if (userError || !userData) throw new Error("Failed to retrieve user profile.");

      router.refresh();

      switch (userData.role) {
        case "dean":
          router.push("/admin");
          break;
        case "hod":
          router.push(`/results?dept=${userData.department || "IFT"}`);
          break;
        case "lecturer":
          router.push("/results");
          break;
        case "student":
          router.push("/student");
          break;
        default:
          throw new Error("Unknown access role. Contact your administrator.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const placeholders: Record<UserRole, string> = {
    dean: "dean.sict@futo.edu.ng",
    hod: "hod.ift@futo.edu.ng",
    lecturer: "lecturer.name@futo.edu.ng",
    student: "20201234567@futo.edu.ng",
  };

  const roleOptions = [
    { value: "student", label: "Student — Ledger Access" },
    { value: "lecturer", label: "Lecturer / Faculty" },
    { value: "hod", label: "Head of Department (HOD)" },
    { value: "dean", label: "Dean of School" },
  ];

  return (
    <div className="min-h-screen flex bg-[#070A12]">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[#0A0F1C] border-r border-[#1E293B] p-12 relative overflow-hidden">
        {/* Grid background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hud-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hud-grid)" />
          </svg>
        </div>

        {/* Glow orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-[0.2em] text-emerald-400/70 uppercase">
                Federal University of Technology
              </div>
              <div className="text-[15px] font-black tracking-widest text-[#F8FAFC] uppercase">
                Owerri
              </div>
            </div>
          </div>

          <h1 className="text-5xl font-black text-[#F8FAFC] leading-[1.1] tracking-tight mb-5">
            Academic<br />
            <span className="text-emerald-400">Grade</span><br />
            Portal
          </h1>
          <p className="text-[#64748B] text-[15px] leading-relaxed max-w-sm font-medium">
            A unified result tracking system for students, faculty, and administrators across SICT departments.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#334155] uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-pulse" />
            <span>System Online — 2025/2026 Academic Session</span>
          </div>
        </div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px] space-y-7">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
              <Terminal className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="text-[14px] font-black tracking-widest text-[#F8FAFC] uppercase">
              FUTO Portal
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-[#F8FAFC] tracking-tight">Secure Sign In</h2>
            <p className="text-[13px] text-[#64748B] font-medium mt-1">
              Specify your access category and institutional credentials.
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-rose-300 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Access Category */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                Access Category
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#0F1524] border border-[#1E293B] text-[13px] font-semibold text-[#F8FAFC] rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all cursor-pointer appearance-none"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0F1524]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                Institutional Email / Student ID
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholders[role]}
                required
                className="w-full bg-[#0F1524] border border-[#1E293B] text-[13px] font-medium text-[#F8FAFC] placeholder:text-[#334155] rounded-xl px-4 py-3 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                  Password
                </label>
                <a href="#" className="text-[11px] font-bold text-emerald-500/70 hover:text-emerald-400 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0F1524] border border-[#1E293B] text-[13px] font-medium text-[#F8FAFC] placeholder:text-[#334155] rounded-xl px-4 py-3 pr-11 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-600 text-white font-bold text-[14px] rounded-xl py-3.5 transition-all duration-150 shadow-lg shadow-emerald-900/30 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authorize Access</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-5 border-t border-[#1E293B]">
            <p className="text-[11px] text-center text-[#334155] font-medium">
              © {new Date().getFullYear()} Federal University of Technology Owerri.
              All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
