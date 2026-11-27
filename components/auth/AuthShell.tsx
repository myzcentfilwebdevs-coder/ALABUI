import type { ReactNode } from "react";
import Image from "next/image";
import wordmark from "@/app/logo/alabBackground.png";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import GuestGuard from "./GuestGuard";
import { BallIcon, HandshakeIcon, StarIcon, TrophyIcon } from "@/components/icons";

const FEATURES = [
  { label: "Play", Icon: BallIcon },
  { label: "Teamwork", Icon: HandshakeIcon },
  { label: "Win Together", Icon: TrophyIcon },
  { label: "Be a Champion", Icon: StarIcon },
];

interface AuthShellProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, icon, children, footer }: AuthShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#030b24] text-white">
      <GuestGuard />
      <SiteHeader />

      <main className="hero-bg relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="hero-streaks pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />

        <div className="relative mx-auto grid max-h-full w-full max-w-6xl items-center gap-4 px-3.5 py-2 sm:px-6 md:grid-cols-2 md:gap-6 md:py-2 xl:max-w-7xl xl:grid-cols-[1.05fr_0.95fr] xl:gap-10">
          {/* Hero (Centered cleanly in the left column on Tablet & Desktop) */}
          <section className="hidden flex-col items-center justify-center text-center md:flex">
            <Image
              src={wordmark}
              alt="ALAB Football Club — Keep the fire burning"
              priority
              className="mx-auto w-full max-w-[300px] drop-shadow-[0_10px_40px_rgba(37,99,235,0.5)] lg:max-w-[360px] xl:max-w-lg"
            />
            <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-snug text-blue-50 lg:text-sm xl:mt-3 xl:text-base">
              Be part of our growing football family.
              <br />
              Register now and play with pride!
            </p>
            <ul className="mt-3 hidden flex-wrap justify-center gap-4 md:flex xl:mt-5 xl:gap-8">
              {FEATURES.map(({ label, Icon }) => (
                <li key={label} className="flex flex-col items-center gap-1">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-300/80 bg-blue-600/30 shadow-[0_0_20px_rgba(59,130,246,0.65)] xl:h-11 xl:w-11">
                    <Icon className="h-4 w-4 xl:h-5 xl:w-5" />
                  </span>
                  <span className="text-[11px] font-medium text-blue-50 xl:text-xs">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Card */}
          <section className="relative mx-auto flex max-h-full w-full max-w-md flex-col xl:max-w-lg">
            <div className="pointer-events-none absolute -inset-1.5 rounded-3xl bg-blue-500/40 blur-xl" />
            <div className="relative flex max-h-[calc(100dvh-96px)] flex-col overflow-hidden rounded-2xl bg-white/95 text-slate-900 shadow-2xl ring-1 ring-white/70 backdrop-blur sm:max-h-[calc(100dvh-104px)]">
              <div className="relative flex shrink-0 items-center gap-3 bg-gradient-to-r from-[#06205f] via-[#0a3197] to-[#0b46d6] px-4 py-2 text-white sm:px-5 sm:py-2.5 xl:py-3">
                <span className="absolute right-0 top-0 h-1.5 w-32 bg-gradient-to-r from-amber-400 to-orange-500 [clip-path:polygon(6%_0,100%_0,100%_100%,0_100%)] sm:w-40" />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b2a6b] ring-2 ring-white/80 shadow-[0_0_18px_rgba(96,165,250,0.8)] sm:h-9 sm:w-9 xl:h-11 xl:w-11 xl:ring-3">
                  {icon}
                </span>
                <div>
                  <h1 className="font-display text-xl font-extrabold uppercase italic leading-none tracking-wide sm:text-2xl xl:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-0.5 text-[11px] font-semibold text-blue-100 sm:text-xs xl:text-sm">
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-5 sm:py-2.5 xl:px-6 xl:py-4">
                {children}
                {footer && (
                  <>
                    <div className="my-1.5 flex items-center gap-3 text-[11px] text-slate-400 xl:my-2.5 xl:text-xs">
                      <span className="h-px flex-1 bg-slate-200" />
                      or
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="text-center text-xs font-medium text-slate-700 xl:text-sm">{footer}</div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
