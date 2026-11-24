"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import crest from "@/app/logo/logoALAB.png";
import { LoginIcon } from "@/components/icons";

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="z-40 shrink-0 border-b border-blue-500/30 bg-[#030b24]/90 shadow-[0_4px_30px_rgba(37,99,235,0.25)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src={crest} alt="ALAB Football Club crest" priority className="h-10 w-auto sm:h-11" />
          <div className="font-display font-extrabold uppercase italic leading-none">
            <span className="block text-2xl tracking-wide sm:text-3xl">ALAB</span>
            <span className="block text-xs tracking-[0.12em] text-blue-100 sm:text-sm">Football Club</span>
          </div>
        </Link>

        <Link
          href="/login"
          className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-sm font-semibold transition ${
            pathname === "/login"
              ? "border-blue-400 bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.7)]"
              : "border-blue-400/70 hover:bg-blue-500/20"
          }`}
        >
          <LoginIcon className="h-4 w-4" />
          Login
        </Link>
      </div>
    </header>
  );
}
