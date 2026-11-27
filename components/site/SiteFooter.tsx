import Image from "next/image";
import crest from "@/app/logo/logoALAB.png";
import { DiscordIcon, FacebookIcon, TiktokIcon, YoutubeIcon } from "@/components/icons";

const SOCIALS = [
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "YouTube", href: "#", Icon: YoutubeIcon },
  { label: "TikTok", href: "#", Icon: TiktokIcon },
  { label: "Discord", href: "#", Icon: DiscordIcon },
];

export default function SiteFooter() {
  return (
    <footer className="relative shrink-0 border-t border-blue-500/40 bg-[#020a22] shadow-[0_-4px_30px_rgba(37,99,235,0.2)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3.5 py-1.5 sm:gap-3 sm:px-6 sm:py-2">
        <div className="hidden items-center gap-2 md:flex">
          <Image src={crest} alt="ALAB Football Club crest" className="h-8 w-auto xl:h-9" />
          <div className="font-display uppercase italic leading-none">
            <span className="block text-base font-extrabold xl:text-lg">ALAB Football Club</span>
            <span className="block text-[11px] font-semibold normal-case text-blue-100/75 xl:text-xs">Keep the fire burning</span>
          </div>
        </div>

        <p className="truncate text-[11px] text-blue-100/65 sm:text-xs">
          © 2026 ALAB Football Club.
        </p>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-blue-600 sm:h-7 sm:w-7"
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </a>
            ))}
          </div>
          <div className="hidden border-l border-white/10 pl-4 md:block">
            <p className="font-display text-lg font-bold italic leading-none text-white">One Team. One Goal.</p>
            <span className="mt-1 block h-0.5 w-28 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-transparent" />
          </div>
        </div>
      </div>
    </footer>
  );
}
