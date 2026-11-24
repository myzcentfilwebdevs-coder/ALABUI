import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";
import { UserIcon } from "@/components/icons";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Registration"
      subtitle="Join ALAB Football Club Today!"
      icon={<UserIcon className="h-7 w-7" />}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Login here
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
