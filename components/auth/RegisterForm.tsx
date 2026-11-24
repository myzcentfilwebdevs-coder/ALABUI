"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  extractAuthenticatorSetup,
  registerUser,
  verifyRegistrationOtp,
  type AuthenticatorSetup,
  type RegisterPayload,
} from "@/lib/api";
import {
  AtIcon,
  CheckIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import { Alert, Checkbox, OtpInput, PasswordField, SelectField, SubmitButton, TextField } from "./fields";

type FormState = RegisterPayload & { confirm_password: string };
type Errors = Partial<Record<keyof FormState | "agree", string>>;

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;

const EMPTY: FormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  username: "",
  email: "",
  phone_number: "",
  address: "",
  password: "",
  confirm_password: "",
};

function validate(f: FormState, agree: boolean): Errors {
  const e: Errors = {};
  if (!f.first_name.trim()) e.first_name = "First name is required.";
  if (!f.last_name.trim()) e.last_name = "Last name is required.";
  if (!f.gender) e.gender = "Please select your gender.";
  if (!f.username.trim()) e.username = "Username is required.";
  else if (!/^[a-zA-Z0-9_.]{3,}$/.test(f.username.trim()))
    e.username = "At least 3 characters (letters, numbers, _ or . only).";
  if (!f.email.trim()) e.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (!f.phone_number.trim()) e.phone_number = "Phone number is required.";
  else if (!/^09\d{9}$/.test(f.phone_number.trim())) e.phone_number = "Use the format 09XXXXXXXXX.";
  if (!f.address.trim()) e.address = "Address is required.";
  if (!f.password) e.password = "Password is required.";
  else if (f.password.length < 6) e.password = "At least 6 characters.";
  if (f.confirm_password !== f.password) e.confirm_password = "Passwords do not match.";
  if (!agree) e.agree = "Please agree to the terms and conditions.";
  return e;
}

const icon = "h-5 w-5";

export default function RegisterForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    email: string;
    username: string;
    authSetup: AuthenticatorSetup;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function update(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    const found = validate(form, agree);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    const { confirm_password: _ignored, ...payload } = form;
    void _ignored;
    const res = await registerUser(payload);
    setLoading(false);

    if (res.ok) {
      setSuccess({
        message: res.message,
        email: payload.email.trim(),
        username: payload.username.trim(),
        authSetup: extractAuthenticatorSetup(res.data),
      });
      setOtp("");
      setOtpError(null);
      setOtpVerified(false);
      setForm(EMPTY);
      setAgree(false);
    } else {
      setServerError(res.message);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!success) return;

    const cleanOtp = otp.replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setOtpError("Please enter the 6-digit code from your authenticator app.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    const res = await verifyRegistrationOtp({
      username_or_email: success.username || success.email,
      otp_code: cleanOtp,
    });
    setVerifyingOtp(false);

    if (res.ok) {
      setOtpVerified(true);
    } else {
      setOtpError(res.message);
    }
  }

  if (success) {
    const { qrCode, secret } = success.authSetup;

    if (otpVerified || (!qrCode && !secret)) {
      return (
        <div className="py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            {otpVerified ? "Authenticator Verified!" : "Welcome to the club!"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {otpVerified
              ? "Your account and two-factor authentication are ready. You can now log in."
              : success.message || "Your account has been created successfully. You can now log in."}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-3 font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.8)] hover:from-blue-600 hover:to-blue-800"
          >
            Continue to Login
          </Link>
        </div>
      );
    }

    return (
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-900">Set Up Your Authenticator</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Scan this QR code with Google Authenticator, then enter the 6-digit OTP below to verify.
        </p>

        {qrCode && (
          <div className="mx-auto mt-2.5 inline-flex rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <Image
              src={qrCode}
              alt="Authenticator QR Code"
              width={144}
              height={144}
              unoptimized
              className="h-36 w-36 rounded-md"
            />
          </div>
        )}

        {secret && (
          <div className="mt-2.5 rounded-lg border border-slate-200 bg-[#eef2fb] px-3 py-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Manual Setup Key
              </span>
              <button
                type="button"
                onClick={() => copySecret(secret)}
                className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 shadow-xs ring-1 ring-slate-200 transition hover:bg-blue-50"
              >
                {copiedSecret ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-0.5 break-all font-mono text-xs font-semibold text-slate-900">{secret}</p>
          </div>
        )}

        <form method="post" onSubmit={onVerifyOtp} noValidate className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-800 sm:text-sm">Enter 6-Digit Authenticator OTP</p>

          {otpError && <Alert type="error">{otpError}</Alert>}

          <OtpInput
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (otpError) setOtpError(null);
            }}
            disabled={verifyingOtp}
          />

          <SubmitButton loading={verifyingOtp} loadingText="Verifying OTP..." icon={<CheckIcon className="h-5 w-5" />}>
            Verify OTP
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-2.5">
      {serverError && <Alert type="error">{serverError}</Alert>}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField
          label="First Name"
          name="first_name"
          icon={<UserIcon className={icon} />}
          value={form.first_name}
          onChange={update}
          error={errors.first_name}
          autoComplete="given-name"
        />
        <TextField
          label="Middle Name"
          name="middle_name"
          placeholder="Middle Name (Optional)"
          icon={<UserIcon className={icon} />}
          value={form.middle_name}
          onChange={update}
          error={errors.middle_name}
          autoComplete="additional-name"
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField
          label="Last Name"
          name="last_name"
          icon={<UserIcon className={icon} />}
          value={form.last_name}
          onChange={update}
          error={errors.last_name}
          autoComplete="family-name"
        />
        <SelectField
          label="Gender"
          name="gender"
          placeholder="Gender"
          icon={<UsersIcon className={icon} />}
          options={GENDER_OPTIONS}
          value={form.gender}
          onChange={update}
          error={errors.gender}
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField
          label="Username"
          name="username"
          icon={<AtIcon className={icon} />}
          value={form.username}
          onChange={update}
          error={errors.username}
          autoComplete="username"
        />
        <TextField
          label="Phone Number"
          name="phone_number"
          type="tel"
          inputMode="numeric"
          maxLength={11}
          icon={<PhoneIcon className={icon} />}
          value={form.phone_number}
          onChange={update}
          error={errors.phone_number}
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <TextField
          label="Email Address"
          name="email"
          type="email"
          icon={<MailIcon className={icon} />}
          value={form.email}
          onChange={update}
          error={errors.email}
          autoComplete="email"
        />
        <TextField
          label="Address"
          name="address"
          icon={<MapPinIcon className={icon} />}
          value={form.address}
          onChange={update}
          error={errors.address}
          autoComplete="address-level2"
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <PasswordField
          label="Password"
          name="password"
          icon={<LockIcon className={icon} />}
          value={form.password}
          onChange={update}
          error={errors.password}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm Password"
          name="confirm_password"
          icon={<LockIcon className={icon} />}
          value={form.confirm_password}
          onChange={update}
          error={errors.confirm_password}
          autoComplete="new-password"
        />
      </div>

      <div className="pt-0.5">
        <Checkbox
          checked={agree}
          onChange={(v) => {
            setAgree(v);
            if (v) setErrors((prev) => ({ ...prev, agree: undefined }));
          }}
          error={errors.agree}
        >
          I agree to the{" "}
          <a href="#terms" className="font-semibold text-blue-600 hover:underline">
            terms and conditions
          </a>
        </Checkbox>
      </div>

      <div className="pt-1">
        <SubmitButton loading={loading} loadingText="Registering..." icon={<SendIcon className="h-5 w-5" />}>
          Register Now
        </SubmitButton>
      </div>
    </form>
  );
}
