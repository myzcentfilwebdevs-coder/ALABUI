export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "#about" },
  { label: "Fixtures", href: "#fixtures" },
  { label: "Gallery", href: "#gallery" },
  { label: "Registration", href: "/register" },
  { label: "Contact", href: "#contact" },
] as const;

export type NavLabel = (typeof NAV_LINKS)[number]["label"];
