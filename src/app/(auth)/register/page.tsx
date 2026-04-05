import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BackgroundBeams } from "@/components/ui/background-beams";

export default async function RegisterPage() {

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <BackgroundBeams className="opacity-35" />
      <div className="relative z-10 flex w-full max-w-md flex-col gap-4">
        <AuthForm mode="register" />
        <p className="text-center text-sm text-zinc-300">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-white underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

