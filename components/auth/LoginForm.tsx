"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  extractAuthToken,
  isOtpRequiredResponse,
  loginUser,
  setAuthToken,
  verifyRegistrationOtp,
} from "@/lib/api";
import { CheckIcon, LockIcon, LoginIcon, UserIcon } from "@/components/icons";
import { Alert, OtpInput, PasswordField, SubmitButton, TextField } from "./fields";

export default function LoginForm() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setStatus({ type: "error", message: "Please enter your username/email and password." });
      return;
    }

    setLoading(true);
    setStatus(null);
    const res = await loginUser({ username_or_email: usernameOrEmail, password });
    setLoading(false);

    if (res.ok) {
      const token = extractAuthToken(res.data);
      if (token) {
        setAuthToken(token);
        router.replace("/dashboard");
      } else if (isOtpRequiredResponse(res.data, res.message)) {
        setNeedsOtp(true);
        setOtp("");
        setStatus(null);
      } else {
        setStatus({ type: "success", message: res.message || "Logged in successfully." });
      }
    } else {
      setStatus({ type: "error", message: res.message });
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setStatus({ type: "error", message: "Please enter the 6-digit code from your authenticator app." });
      return;
    }

    setVerifyingOtp(true);
    setStatus(null);
    const res = await verifyRegistrationOtp({
      username_or_email: usernameOrEmail,
      otp_code: cleanOtp,
    });
    setVerifyingOtp(false);

    if (res.ok) {
      const token = extractAuthToken(res.data);
      if (token) {
        setAuthToken(token);
        router.replace("/dashboard");
        return;
      }
      setNeedsOtp(false);
      setOtp("");
      setStatus({ type: "success", message: res.message || "Logged in successfully." });
    } else {
      setStatus({ type: "error", message: res.message });
    }
  }

  if (needsOtp) {
    return (
      <form method="post" onSubmit={onVerifyOtp} noValidate className="space-y-4 text-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Enter Authenticator OTP</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="font-semibold text-slate-700">{usernameOrEmail}</span>.
          </p>
        </div>

        {status && <Alert type={status.type}>{status.message}</Alert>}

        <OtpInput
          value={otp}
          onChange={(next) => {
            setOtp(next);
            if (status?.type === "error") setStatus(null);
          }}
          disabled={verifyingOtp}
        />

        <SubmitButton loading={verifyingOtp} loadingText="Verifying OTP..." icon={<CheckIcon className="h-5 w-5" />}>
          Verify & Login
        </SubmitButton>

        <button
          type="button"
          onClick={() => {
            setNeedsOtp(false);
            setOtp("");
            setStatus(null);
          }}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Back to Login
        </button>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-3">
      {status && <Alert type={status.type}>{status.message}</Alert>}

      <TextField
        label="Username or Email"
        name="username_or_email"
        icon={<UserIcon className="h-5 w-5" />}
        value={usernameOrEmail}
        onChange={(e) => setUsernameOrEmail(e.target.value)}
        autoComplete="username"
      />
      <PasswordField
        label="Password"
        name="password"
        icon={<LockIcon className="h-5 w-5" />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>

      <SubmitButton loading={loading} loadingText="Logging in..." icon={<LoginIcon className="h-5 w-5" />}>
        Login
      </SubmitButton>
    </form>
  );
}
