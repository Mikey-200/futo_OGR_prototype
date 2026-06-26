"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { BookMarked, Shield, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
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
      // Step 1 — Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Authentication failed — no user session returned.");

      const uid = authData.user.id;

      // Step 2 — Fetch profile from public.users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, department, school, full_name")
        .eq("id", uid)
        .single();

      if (userError || !userData) {
        // If user not in public.users yet, sign out gracefully
        await supabase.auth.signOut();
        throw new Error(
          "Your account profile is not yet activated. Contact your portal administrator."
        );
      }

      // Step 3 — Enrich profile based on role
      let firstCourse: any = null;

      if (userData.role === "student") {
        // Pull dept from students table to confirm
        const { data: studentData } = await supabase
          .from("students")
          .select("department, current_level")
          .eq("profile_id", uid)
          .single();
        // (dept stays IFT for this prototype)
      }

      if (userData.role === "lecturer") {
        // Smart redirect to first allocated course
        const { data: allocations } = await supabase
          .from("lecturer_allocations")
          .select("courses(department, course_code, level, semester)")
          .eq("lecturer_id", uid)
          .limit(1);
        if (allocations && allocations.length > 0) {
          firstCourse = (allocations[0] as any).courses;
        }
      }

      // Step 4 — Navigate based on DB role (ignores UI dropdown)
      router.refresh();

      switch (userData.role) {
        case "hod":
          router.push("/results?dept=IFT");
          break;
        case "course_advisor": {
          // Advisor scoped to their level — redirect straight to that level
          const advisorLevel = userData.advisor_level;
          router.push(
            advisorLevel
              ? `/results?dept=IFT&level=${advisorLevel}L&semester=Harmattan`
              : "/results?dept=IFT"
          );
          break;
        }
        case "lecturer":
          if (firstCourse) {
            router.push(
              `/results?dept=IFT&course=${firstCourse.course_code}&level=${firstCourse.level}L&semester=${firstCourse.semester}`
            );
          } else {
            router.push("/results?dept=IFT");
          }
          break;
        case "student":
          router.push("/student");
          break;
        default:
          throw new Error("Unrecognized access role — contact your administrator.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const placeholders: Record<UserRole, string> = {
    hod: "hod.ift@futo.edu.ng",
    course_advisor: "advisor.400l@futo.edu.ng",
    lecturer: "lecturer.name@futo.edu.ng",
    student: "20201234567@futo.edu.ng",
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">

      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-[#15803D] p-12 relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">Federal University of Technology</div>
              <div className="text-[15px] font-black tracking-widest text-white uppercase">Owerri</div>
            </div>
          </div>

          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
            Academic<br />Grade<br />Portal
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed max-w-sm font-medium">
            A unified result tracking system for students, faculty, and administrators across SICT departments.
          </p>
        </div>

        <div className="relative z-10 text-white/50 text-[12px] font-semibold">
          © {new Date().getFullYear()} Federal University of Technology Owerri.
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[400px] space-y-7">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#15803D] rounded-xl flex items-center justify-center shadow-sm">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[13px] font-black text-[#0F172A]">FUTO IFT Portal</div>
              <div className="text-[10px] font-bold text-[#15803D] uppercase tracking-widest">IFT Result Ledger</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Secure Sign In</h2>
            <p className="text-[13px] text-[#64748B] font-medium mt-1">
              Select your access category and enter your credentials.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[13px] text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                Access Category
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white border border-[#E2E8F0] text-[13px] font-semibold text-[#0F172A] rounded-xl px-4 py-3 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 transition-all cursor-pointer appearance-none shadow-sm"
              >
                <option value="student">Student — Ledger Access</option>
                <option value="lecturer">Lecturer / Staff</option>
                <option value="course_advisor">Course Advisor</option>
                <option value="hod">Head of Department (HOD)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholders[role]}
                required
                className="w-full bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#0F172A] placeholder:text-[#CBD5E1] rounded-xl px-4 py-3 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#475569]">
                  Password
                </label>
                <a href="#" className="text-[11px] font-bold text-[#15803D] hover:underline">
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
                  className="w-full bg-white border border-[#E2E8F0] text-[13px] font-medium text-[#0F172A] placeholder:text-[#CBD5E1] rounded-xl px-4 py-3 pr-11 outline-none focus:border-[#15803D] focus:ring-2 focus:ring-[#15803D]/10 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CBD5E1] hover:text-[#64748B] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-[#15803D] hover:bg-[#166534] disabled:bg-[#86EFAC] disabled:cursor-not-allowed text-white font-bold text-[14px] rounded-xl py-3.5 transition-all shadow-sm shadow-[#15803D]/20 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Authenticating...</span></>
              ) : (
                <><Shield className="w-4 h-4" /><span>Authorize Access</span></>
              )}
            </button>
          </form>

          <div className="pt-5 border-t border-[#E2E8F0]">
            <p className="text-[11px] text-center text-[#94A3B8] font-medium">
              By signing in, you agree to the university's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
