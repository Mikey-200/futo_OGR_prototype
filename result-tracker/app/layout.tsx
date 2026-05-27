import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FUTO Result Portal",
  description: "Premium Digital OGR Platform",
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
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
    
    // For students, fetch full name from students table if not in users
    let fullName = userData?.full_name || '';
    if (userData?.role === 'student' && !fullName) {
       const { data: studentData } = await supabase.from('students').select('full_name, department').eq('profile_id', user.id).single();
       if (studentData) {
         fullName = studentData.full_name;
         userData.department = studentData.department;
       }
    }

    if (userData) {
      userProfile = {
        email: user.email || '',
        role: userData.role,
        full_name: fullName,
        school: userData.school,
        department: userData.department,
        assigned_courses: userData.assigned_courses
      };
    }
  }

  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground antialiased min-h-screen selection:bg-futo-light selection:text-futo-green flex flex-col md:flex-row`}>
        {userProfile && <Sidebar user={userProfile} />}
        <main className={`flex-1 w-full flex flex-col ${userProfile ? 'md:ml-72' : ''}`}>
          {children}
        </main>
      </body>
    </html>
  );
}
