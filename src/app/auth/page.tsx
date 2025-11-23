import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function AuthPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/app");
  }

  return <LoginForm />;
}
