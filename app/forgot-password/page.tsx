import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { KeyIcon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot Password"
      subtitle="We'll help you get back in the game."
      icon={<KeyIcon className="h-7 w-7" />}
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Login here
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
