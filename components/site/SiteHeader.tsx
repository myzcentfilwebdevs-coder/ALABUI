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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3.5 py-1.5 sm:px-6 xl:py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src={crest} alt="ALAB Football Club crest" priority className="h-8 w-auto sm:h-9 xl:h-10" />
          <div className="font-display font-extrabold uppercase italic leading-none">
            <span className="block text-lg tracking-wide sm:text-2xl xl:text-3xl">ALAB</span>
            <span className="block text-[10px] tracking-[0.12em] text-blue-100 sm:text-[11px] xl:text-sm">Football Club</span>
          </div>
        </Link>

        <Link
          href="/login"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition sm:gap-2 sm:px-3.5 sm:text-sm ${
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
