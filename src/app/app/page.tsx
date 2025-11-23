import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AppDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      bem vindo
      <pre>
        <code>{JSON.stringify(session)}</code>
      </pre>
    </div>
  );
}
