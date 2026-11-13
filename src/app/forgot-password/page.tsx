import { redirect } from "next/navigation";

// Local-only app: no login.
export default function Page() {
  redirect("/");
}
