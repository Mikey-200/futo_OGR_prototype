import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FUTO Result Portal | SICT Academic Ledger",
  description: "Federal University of Technology Owerri — SICT Academic Grade Portal",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userData) {
      let fullName = userData.full_name || '';
      let department = userData.department || '';

      // For students: pull name + dept from students table if missing
      if (userData.role === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('full_name, department')
          .eq('profile_id', user.id)
          .single();
        if (studentData) {
          fullName = fullName || studentData.full_name;
          department = department || studentData.department;
        }
      }

      // For lecturers: fetch allocated courses
      let allocations: any[] = [];
      if (userData.role === 'lecturer') {
        const { data: allocData } = await supabase
          .from('lecturer_allocations')
          .select('*, courses(*)')
          .eq('lecturer_id', user.id);
        if (allocData) {
          allocations = allocData.map((a: any) => a.courses).filter(Boolean);
        }
      }

      userProfile = {
        id: user.id,
        email: user.email || '',
        role: userData.role,
        full_name: fullName,
        school: userData.school || '',
        department,
        assigned_courses: userData.assigned_courses || [],
        allocations,
      };
    }
  }

  const isAuthenticated = !!userProfile;

  return (
    <html lang="en">
      <body className={`${inter.variable} bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen`}>
        <div className="flex min-h-screen">
          {/* Fixed 260px sidebar */}
          {isAuthenticated && <Sidebar user={userProfile!} />}

          {/* Main content — hard left margin to prevent any overlap */}
          <main
            className={`flex-1 flex flex-col min-h-screen overflow-hidden ${
              isAuthenticated ? 'md:ml-[260px]' : ''
            }`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
