import { redirect } from "next/navigation";

// The Philippine homepage now lives at "/".
export default function PhRedirect() {
  redirect("/");
}
