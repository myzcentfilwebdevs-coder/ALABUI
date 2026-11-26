"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, verifyAuthSession } from "@/lib/api";
import { ShieldLockIcon } from "@/components/icons";

/**
 * Prevents already-authenticated users from landing back on /login, /register,
 * or /forgot-password via the browser Back button or direct URL entry.
 */
export default function GuestGuard() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!getAuthToken()) return;
      const { valid } = await verifyAuthSession();
      if (!cancelled && valid) {
        setRedirecting(true);
        router.replace("/dashboard");
      }
    }

    void checkSession();

    function handlePageShow() {
      void checkSession();
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  if (!redirecting) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030b24]/95 px-4 text-center text-white backdrop-blur-md">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_28px_rgba(56,189,248,0.6)]">
        <ShieldLockIcon className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-bold text-white">Active Session Detected</p>
      <p className="mt-1 text-xs text-blue-200/80">
        Returning you securely to the ALAB FC Portal...
      </p>
    </div>
  );
}
