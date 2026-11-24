"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { forgotPasswordRequest } from "@/lib/api";
import { CheckIcon, KeyIcon, LockIcon, UserIcon } from "@/components/icons";
import { Alert, OtpInput, PasswordField, SubmitButton, TextField } from "./fields";

interface Errors {
  username_or_email?: string;
  otp_code?: string;
  new_password?: string;
  confirm_password?: string;
}

export default function ForgotPasswordForm() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const cleanOtp = otpCode.replace(/\D/g, "");
    const found: Errors = {};
    if (!usernameOrEmail.trim()) found.username_or_email = "Username or email is required.";
    if (cleanOtp.length !== 6) found.otp_code = "Enter the 6-digit code from your authenticator app.";
    if (!newPassword) found.new_password = "New password is required.";
    else if (newPassword.length < 6) found.new_password = "At least 6 characters.";
    if (confirmPassword !== newPassword) found.confirm_password = "Passwords do not match.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const res = await forgotPasswordRequest({
      username_or_email: usernameOrEmail,
      otp_code: cleanOtp,
      new_password: newPassword,
    });
    setLoading(false);

    if (res.ok) {
      setSuccessMessage(res.message || "Password updated successfully.");
      setUsernameOrEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setServerError(res.message);
    }
  }

  if (successMessage) {
    return (
      <div className="py-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-900">Password Updated!</h2>
        <p className="mt-1 text-sm text-slate-600">{successMessage}</p>
        <Link
          href="/login"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-2.5 font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.8)] hover:from-blue-600 hover:to-blue-800"
        >
          Continue to Login
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-3">
      {serverError && <Alert type="error">{serverError}</Alert>}

      <p className="text-xs text-slate-600 sm:text-sm">
        Enter your username or email, verify using your Google Authenticator OTP, and set a new password.
      </p>

      <TextField
        label="Username or Email"
        name="username_or_email"
        icon={<UserIcon className="h-5 w-5" />}
        value={usernameOrEmail}
        onChange={(e) => {
          setUsernameOrEmail(e.target.value);
          if (errors.username_or_email) setErrors((prev) => ({ ...prev, username_or_email: undefined }));
        }}
        error={errors.username_or_email}
        autoComplete="username"
      />

      <div className="space-y-1.5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          6-Digit Authenticator OTP
        </p>
        <OtpInput
          value={otpCode}
          onChange={(next) => {
            setOtpCode(next);
            if (errors.otp_code) setErrors((prev) => ({ ...prev, otp_code: undefined }));
          }}
          disabled={loading}
          error={errors.otp_code}
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <PasswordField
          label="New Password"
          name="new_password"
          icon={<LockIcon className="h-5 w-5" />}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (errors.new_password) setErrors((prev) => ({ ...prev, new_password: undefined }));
          }}
          error={errors.new_password}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm Password"
          name="confirm_password"
          icon={<LockIcon className="h-5 w-5" />}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirm_password) setErrors((prev) => ({ ...prev, confirm_password: undefined }));
          }}
          error={errors.confirm_password}
          autoComplete="new-password"
        />
      </div>

      <div className="pt-1">
        <SubmitButton loading={loading} loadingText="Updating password..." icon={<KeyIcon className="h-5 w-5" />}>
          Reset Password
        </SubmitButton>
      </div>
    </form>
  );
}
