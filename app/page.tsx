"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, BookOpen, UserCheck, GraduationCap, Building2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { createClient } from "@/utils/supabase";

type Role = "HOD" | "Lecturer" | "Student";

export default function LoginPortal() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<Role>("Student");
  const [email, setEmail] = useState("student@futo.ng");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Attempt to drop any stray local states/sessions on mount
    const clearSession = async () => {
      await supabase.auth.signOut();
    };
    clearSession();

    // Pre-fill email based on role selection for demonstration
    if (role === "Student") setEmail("20201234567@futo.ng");
    else if (role === "HOD") setEmail("dean@futo.ng");
    else setEmail("staff@futo.ng");
  }, [role, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!email || !password) {
        toast.error("Please enter both email and password.");
        return;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error || !data.user) {
        throw new Error(error?.message || "Authentication failed");
      }

      // Validate against public.users ledger
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        throw new Error("Unable to verify role designation metadata.");
      }

      // Enforce strict matching between chosen UI role and database role
      if (userData.role.toLowerCase() !== role.toLowerCase()) {
        await supabase.auth.signOut();
        toast.error("Unauthorized role designation");
        return;
      }
      
      toast.success(`Welcome to the portal, ${role}!`);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Left Column (50%) - Forest Green with Grid */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#105e2e] relative flex-col justify-between p-12 overflow-hidden">
        {/* CSS Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
            `
          }}
        ></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-24">
            <div className="bg-white text-[#105e2e] p-2 rounded-md font-bold shadow-md flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-white font-bold tracking-widest text-lg uppercase">FUTO</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
              Institutional<br/>Grade Portal
            </h1>
            <p className="text-futo-green-50 text-lg leading-relaxed font-light mb-2 opacity-90">
              A unified system for students, faculty, and administrators to seamlessly manage and track academic progression.
            </p>
            <p className="text-futo-green-100 text-sm opacity-70 font-medium">
              Department of Information Technology (SICT)
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-medium">
            © 2026 Federal University of Technology Owerri.
          </p>
        </div>
      </div>

      {/* Right Column (50%) - Pure White Minimal Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <div className="w-full max-w-[420px]">
          
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Secure Sign In</h2>
            <p className="text-sm text-gray-500 font-medium">Specify your access category and credentials.</p>
          </div>
          
          {/* Custom Role Selector (Tabbed) */}
          <div className="mb-8">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Access Category</label>
            <div className="flex bg-gray-50/80 p-1.5 rounded-xl border border-gray-100 shadow-inner">
              <button
                type="button"
                onClick={() => setRole("HOD")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  role === "HOD" ? "bg-white text-[#105e2e] shadow border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }`}
              >
                <Building2 className="w-4 h-4" /> HOD
              </button>
              <button
                type="button"
                onClick={() => setRole("Lecturer")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  role === "Lecturer" ? "bg-white text-[#105e2e] shadow border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }`}
              >
                <UserCheck className="w-4 h-4" /> Staff
              </button>
              <button
                type="button"
                onClick={() => setRole("Student")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                  role === "Student" ? "bg-white text-[#105e2e] shadow border border-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Student
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Institutional Email / ID</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#105e2e] focus:border-[#105e2e] outline-none transition-shadow text-gray-900 font-medium shadow-sm bg-white"
                  placeholder="name@futo.ng"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-300" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Password</label>
                <a href="#" className="text-xs font-bold text-gray-400 hover:text-[#105e2e] transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#105e2e] focus:border-[#105e2e] outline-none transition-shadow text-gray-900 font-medium shadow-sm bg-white"
                  placeholder="••••••••"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-300" />
                </div>
              </div>
            </div>

            <div className="flex items-center py-2">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#105e2e] focus:ring-[#105e2e] border-gray-300 rounded cursor-pointer transition-colors"
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-600 font-medium cursor-pointer">
                Remember me on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-[#105e2e] hover:bg-[#0d4a24] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#105e2e] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4 transform active:scale-[0.98]"
            >
              {isLoading ? (
                "Authorizing..."
              ) : (
                <>
                  <Shield className="w-5 h-5" /> Authorize Access
                </>
              )}
            </button>
            
            <p className="text-center text-[11px] text-gray-400 font-medium mt-8 leading-relaxed max-w-xs mx-auto">
              By signing in, you agree to the <span className="text-gray-600">Terms of Service</span> and <span className="text-gray-600">Privacy Policy</span> of the university.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
