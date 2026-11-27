"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  extractAuthenticatorSetup,
  extractEmailVerifiedFlag,
  fetchRegistrationStatus,
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
  RefreshIcon,
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

const icon = "h-4 w-4 xl:h-5 xl:w-5";
const PENDING_REG_KEY = "alab_pending_registration";
const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PendingRegistration {
  message: string;
  email: string;
  username: string;
  emailVerified: boolean;
  authSetup: AuthenticatorSetup;
  savedAt?: number;
}

function savePendingReg(state: PendingRegistration) {
  try {
    localStorage.setItem(PENDING_REG_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

function clearPendingReg() {
  try {
    localStorage.removeItem(PENDING_REG_KEY);
    sessionStorage.removeItem(PENDING_REG_KEY);
  } catch {
    // ignore storage errors
  }
}

export default function RegisterForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PendingRegistration | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Resume QR/OTP flow for users who already verified their email in another tab or device
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeIdentifier, setResumeIdentifier] = useState("");
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Restore pending email verification across tabs (e.g. when returning from Gmail)
    try {
      const saved =
        localStorage.getItem(PENDING_REG_KEY) || sessionStorage.getItem(PENDING_REG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PendingRegistration>;
        const fresh = !parsed.savedAt || Date.now() - parsed.savedAt < PENDING_TTL_MS;
        if (fresh && parsed && (parsed.username || parsed.email)) {
          setTimeout(() => {
            setSuccess({
              message: parsed.message || "Please verify your email to continue.",
              email: parsed.email || "",
              username: parsed.username || "",
              emailVerified: Boolean(parsed.emailVerified),
              authSetup: parsed.authSetup ?? {},
              savedAt: parsed.savedAt,
            });
          }, 0);
        } else if (!fresh) {
          clearPendingReg();
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const checkVerificationStatus = useCallback(
    async (identifier: string, manual = false) => {
      if (!identifier) return;
      if (manual) {
        setCheckingEmail(true);
        setStatusHint(null);
      }
      const res = await fetchRegistrationStatus(identifier);
      if (manual) setCheckingEmail(false);

      if (res.ok && res.data.email_verified) {
        setStatusHint(null);
        setSuccess((prev) => {
          if (!prev) return prev;
          const updated: PendingRegistration = {
            ...prev,
            emailVerified: true,
            authSetup: {
              ...prev.authSetup,
              ...res.data.authSetup,
            },
          };
          savePendingReg(updated);
          return updated;
        });
      } else if (manual) {
        setStatusHint(
          res.ok
            ? 'Email is not verified yet. Open Gmail and click the "Verify Account" button first.'
            : res.message || "Could not check verification status yet."
        );
      }
    },
    []
  );

  // Auto-poll GET /api/auth/registration-status immediately + every 3s (and on tab focus)
  useEffect(() => {
    if (!success || success.emailVerified || otpVerified) return;
    const identifier = success.username || success.email;
    if (!identifier) return;

    const initialTimer = setTimeout(() => {
      void checkVerificationStatus(identifier, false);
    }, 150);

    const interval = setInterval(() => {
      void checkVerificationStatus(identifier, false);
    }, 3000);

    function handleFocus() {
      void checkVerificationStatus(identifier, false);
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void checkVerificationStatus(identifier, false);
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [success, otpVerified, checkVerificationStatus]);

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

  function resetRegistrationFlow() {
    clearPendingReg();
    setSuccess(null);
    setStatusHint(null);
    setOtp("");
    setOtpError(null);
    setOtpVerified(false);
    setResumeOpen(false);
    setResumeError(null);
  }

  async function handleResumeLookup(e: FormEvent) {
    e.preventDefault();
    const id = resumeIdentifier.trim();
    if (!id) {
      setResumeError("Enter your registered username or email.");
      return;
    }

    setResumeLoading(true);
    setResumeError(null);
    const res = await fetchRegistrationStatus(id);
    setResumeLoading(false);

    if (!res.ok) {
      setResumeError(res.message || "No pending registration found for that username or email.");
      return;
    }

    const nextState: PendingRegistration = {
      message: res.data.message || "Registration found.",
      email: id.includes("@") ? id : "",
      username: id.includes("@") ? "" : id,
      emailVerified: res.data.email_verified,
      authSetup: res.data.authSetup,
    };
    savePendingReg(nextState);
    setSuccess(nextState);
    setResumeOpen(false);
    setResumeError(null);
    setOtp("");
    setOtpError(null);
    setOtpVerified(false);
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
      const authSetup = extractAuthenticatorSetup(res.data);
      const emailFlag = extractEmailVerifiedFlag(res.data);
      const emailVerified =
        emailFlag === true || (emailFlag !== false && Boolean(authSetup.qrCode || authSetup.secret));

      const nextState: PendingRegistration = {
        message: res.message,
        email: payload.email.trim(),
        username: payload.username.trim(),
        emailVerified,
        authSetup,
      };

      setSuccess(nextState);
      setStatusHint(null);
      setOtp("");
      setOtpError(null);
      setOtpVerified(false);
      setForm(EMPTY);
      setAgree(false);
      savePendingReg(nextState);
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
      clearPendingReg();
    } else {
      setOtpError(res.message);
    }
  }

  if (success) {
    const { qrCode, secret } = success.authSetup;

    // STEP 2 & 3: Waiting for Email Verification link click in Gmail
    if (!success.emailVerified && !otpVerified) {
      const identifier = success.username || success.email;
      return (
        <div className="space-y-3 py-1 text-center">
          {/* Step Progress Pills */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">1. Info ✓</span>
            <span className="text-slate-300">→</span>
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-white shadow-xs">2. Verify Email</span>
            <span className="text-slate-300">→</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">3. QR &amp; OTP</span>
          </div>

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 ring-4 ring-blue-50">
            <MailIcon className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Verify Your Email Address
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              We sent a verification link to{" "}
              <strong className="text-slate-900">{success.email || success.username}</strong>.
              Open your Gmail inbox (check <strong>Spam / Updates</strong> too) and click{" "}
              <strong className="text-blue-700">&ldquo;Verify Account&rdquo;</strong> to unlock your
              Google Authenticator QR code.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Waiting for email verification... (auto-checking)
          </div>

          {statusHint && <Alert type="error">{statusHint}</Alert>}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={checkingEmail}
              onClick={() => void checkVerificationStatus(identifier, true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.75)] transition hover:from-blue-600 hover:to-blue-800 disabled:opacity-65 sm:text-sm"
            >
              <RefreshIcon className={`h-4 w-4 ${checkingEmail ? "animate-spin" : ""}`} />
              {checkingEmail ? "Checking Verification..." : "I've Verified My Email — Continue"}
            </button>

            <button
              type="button"
              onClick={resetRegistrationFlow}
              className="text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline"
            >
              Use a different email or edit details
            </button>
          </div>
        </div>
      );
    }

    // FINAL COMPLETE STATE
    if (otpVerified || (!qrCode && !secret)) {
      return (
        <div className="py-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-lg font-bold text-slate-900 sm:text-xl">
            {otpVerified ? "Authenticator Verified!" : "Email Verified!"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {otpVerified
              ? "Your account and two-factor authentication are ready. You can now log in."
              : success.message || "Your account has been verified. You can now log in."}
          </p>
          <Link
            href="/login"
            onClick={clearPendingReg}
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.8)] hover:from-blue-600 hover:to-blue-800"
          >
            Continue to Login
          </Link>
        </div>
      );
    }

    // STEP 4: Email Verified -> Scan QR Code & Verify 6-Digit OTP
    return (
      <div className="text-center">
        <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          <CheckIcon className="h-3.5 w-3.5" />
          Email Verified!
        </div>
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Set Up Your Authenticator</h2>
        <p className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">
          Scan this QR code with Google Authenticator, then enter the 6-digit OTP below to finish.
        </p>

        {qrCode && (
          <div className="mx-auto mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <Image
              src={qrCode}
              alt="Authenticator QR Code"
              width={136}
              height={136}
              unoptimized
              className="h-32 w-32 rounded-md sm:h-36 sm:w-36"
            />
          </div>
        )}

        {secret && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-[#eef2fb] px-3 py-1.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Manual Setup Key
              </span>
              <button
                type="button"
                onClick={() => copySecret(secret)}
                className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 shadow-xs ring-1 ring-slate-200 transition hover:bg-blue-50"
              >
                {copiedSecret ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-0.5 break-all font-mono text-[11px] font-semibold text-slate-900">{secret}</p>
          </div>
        )}

        <form method="post" onSubmit={onVerifyOtp} noValidate className="mt-2.5 space-y-2 border-t border-slate-200 pt-2.5">
          <p className="text-xs font-semibold text-slate-800">Enter 6-Digit Authenticator OTP</p>

          {otpError && <Alert type="error">{otpError}</Alert>}

          <OtpInput
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (otpError) setOtpError(null);
            }}
            disabled={verifyingOtp}
          />

          <SubmitButton loading={verifyingOtp} loadingText="Verifying OTP..." icon={<CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />}>
            Verify OTP
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (resumeOpen) {
    return (
      <form method="post" onSubmit={handleResumeLookup} noValidate className="space-y-3 py-1 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 ring-4 ring-blue-50">
          <MailIcon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
            Resume Authenticator Setup
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Already verified your email in Gmail? Enter your username or email to load your QR code.
          </p>
        </div>

        {resumeError && <Alert type="error">{resumeError}</Alert>}

        <TextField
          label="Username or Email"
          name="resume_identifier"
          icon={<UserIcon className={icon} />}
          value={resumeIdentifier}
          onChange={(e) => {
            setResumeIdentifier(e.target.value);
            if (resumeError) setResumeError(null);
          }}
          autoComplete="username"
        />

        <SubmitButton
          loading={resumeLoading}
          loadingText="Checking Status..."
          icon={<RefreshIcon className="h-4 w-4" />}
        >
          Show QR Code &amp; Verify OTP
        </SubmitButton>

        <button
          type="button"
          onClick={() => {
            setResumeOpen(false);
            setResumeError(null);
          }}
          className="text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline"
        >
          Back to Registration Form
        </button>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-1.5 xl:space-y-2">
      {serverError && <Alert type="error">{serverError}</Alert>}

      <div className="grid grid-cols-2 gap-1.5 xl:gap-2.5">
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
          placeholder="Middle (Optional)"
          icon={<UserIcon className={icon} />}
          value={form.middle_name}
          onChange={update}
          error={errors.middle_name}
          autoComplete="additional-name"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 xl:gap-2.5">
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

      <div className="grid grid-cols-2 gap-1.5 xl:gap-2.5">
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

      <div className="grid grid-cols-2 gap-1.5 xl:gap-2.5">
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

      <div className="grid grid-cols-2 gap-1.5 xl:gap-2.5">
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
          placeholder="Confirm Pass"
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

      <div className="pt-0.5">
        <SubmitButton loading={loading} loadingText="Registering..." icon={<SendIcon className="h-4 w-4 sm:h-5 sm:w-5" />}>
          Register Now
        </SubmitButton>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setResumeOpen(true);
            setResumeError(null);
          }}
          className="text-[11px] font-semibold text-blue-700 hover:underline"
        >
          Already verified your email? Show QR Code &amp; Verify OTP
        </button>
      </div>
    </form>
  );
}
