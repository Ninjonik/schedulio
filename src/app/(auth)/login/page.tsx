import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { getCurrentUser } from "@/lib/appwrite";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/calendar");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <BackgroundBeams className="opacity-35" />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-4">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-zinc-300">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-white underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

