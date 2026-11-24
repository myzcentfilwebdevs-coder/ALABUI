import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { LoginIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <AuthShell
      title="Login"
      subtitle="Welcome back, Alab family!"
      icon={<LoginIcon className="h-7 w-7" />}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
