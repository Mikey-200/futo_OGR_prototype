import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "FUTO Result Portal | SICT Academic Ledger",
  description: "Federal University of Technology Owerri — School of Information and Communication Technology Academic Grade Portal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userProfile = null;

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let fullName = userData?.full_name || '';

    // For students, pull full_name from the students table if missing
    if (userData?.role === 'student' && !fullName) {
      const { data: studentData } = await supabase
        .from('students')
        .select('full_name, department')
        .eq('profile_id', user.id)
        .single();
      if (studentData) {
        fullName = studentData.full_name;
        if (userData) userData.department = studentData.department;
      }
    }

    // For lecturers, fetch their allocated courses from lecturer_allocations
    let allocations: any[] = [];
    if (userData?.role === 'lecturer') {
      const { data: allocationsData } = await supabase
        .from('lecturer_allocations')
        .select('*, courses(*)')
        .eq('lecturer_id', user.id);
      if (allocationsData) {
        allocations = allocationsData.map((a: any) => a.courses).filter(Boolean);
      }
    }

    if (userData) {
      userProfile = {
        id: user.id,
        email: user.email || '',
        role: userData.role,
        full_name: fullName,
        school: userData.school,
        department: userData.department,
        assigned_courses: userData.assigned_courses,
        allocations,
      };
    }
  }

  const isAuthenticated = !!userProfile;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} bg-[#070A12] text-[#F8FAFC] antialiased min-h-screen`}>
        <div className="flex min-h-screen">
          {isAuthenticated && <Sidebar user={userProfile!} />}
          <main className={`flex-1 flex flex-col min-h-screen overflow-hidden ${isAuthenticated ? 'md:ml-[260px]' : ''}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
