import type { ReactNode } from "react";
import Image from "next/image";
import wordmark from "@/app/logo/alabBackground.png";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
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
    <div className="flex min-h-dvh flex-col bg-[#030b24] text-white lg:h-dvh lg:overflow-hidden">
      <SiteHeader />

      <main className="hero-bg relative flex flex-1 items-center overflow-hidden">
        <div className="hero-streaks pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-10 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-3">
          {/* Hero */}
          <section className="text-center lg:text-left">
            <Image
              src={wordmark}
              alt="ALAB Football Club — Keep the fire burning"
              priority
              className="mx-auto w-full max-w-md drop-shadow-[0_10px_40px_rgba(37,99,235,0.5)] xl:max-w-lg lg:mx-0"
            />
            <p className="mx-auto mt-3 max-w-md text-base font-semibold leading-snug text-blue-50 lg:mx-0 lg:pl-4">
              Be part of our growing football family.
              <br />
              Register now and play with pride!
            </p>
            <ul className="mt-5 flex flex-wrap justify-center gap-5 sm:gap-8 lg:justify-start lg:pl-4">
              {FEATURES.map(({ label, Icon }) => (
                <li key={label} className="flex flex-col items-center gap-1.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-300/80 bg-blue-600/30 shadow-[0_0_20px_rgba(59,130,246,0.65)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-blue-50">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Card */}
          <section className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-1.5 rounded-3xl bg-blue-500/40 blur-xl" />
            <div className="relative overflow-hidden rounded-2xl bg-white/95 text-slate-900 shadow-2xl ring-1 ring-white/70 backdrop-blur">
              <div className="relative flex items-center gap-3.5 bg-gradient-to-r from-[#06205f] via-[#0a3197] to-[#0b46d6] px-5 py-3.5 text-white">
                <span className="absolute right-0 top-0 h-1.5 w-40 bg-gradient-to-r from-amber-400 to-orange-500 [clip-path:polygon(6%_0,100%_0,100%_100%,0_100%)]" />
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0b2a6b] ring-3 ring-white/80 shadow-[0_0_18px_rgba(96,165,250,0.8)]">
                  {icon}
                </span>
                <div>
                  <h1 className="font-display text-2xl font-extrabold uppercase italic leading-none tracking-wide sm:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-0.5 text-xs font-semibold text-blue-100 sm:text-sm">{subtitle}</p>
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6 lg:max-h-[calc(100dvh-205px)] lg:overflow-y-auto">
                {children}
                {footer && (
                  <>
                    <div className="my-3 flex items-center gap-3 text-xs text-slate-400">
                      <span className="h-px flex-1 bg-slate-200" />
                      or
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="text-center text-xs font-medium text-slate-700 sm:text-sm">{footer}</div>
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
