import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function FacultyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "lecturer") redirect("/");

  // Get their first allocation and redirect to that results page
  const { data: allocations } = await supabase
    .from("lecturer_allocations")
    .select("courses(*)")
    .eq("lecturer_id", user.id)
    .limit(1);

  if (allocations && allocations.length > 0 && allocations[0].courses) {
    const course = allocations[0].courses as any;
    return redirect(
      `/results?dept=${course.department}&course=${course.course_code}&level=${course.level}L&semester=${course.semester}`
    );
  }

  // No allocations — redirect to bare results page
  return redirect("/results");
}
