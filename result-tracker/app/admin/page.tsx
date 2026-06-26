import { redirect } from "next/navigation";

/**
 * /admin is no longer a valid route in the IFT prototype.
 * All roles route through /results or /student.
 * HOD lands at /results?dept=IFT via the login flow.
 */
export default function AdminPage() {
  redirect("/results?dept=IFT");
}
