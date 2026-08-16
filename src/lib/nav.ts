export type NavItem = {
  href: string;
  /** Always lowercase — UI copy never capitalises. */
  label: string;
  /** Two-character readout used by the mobile bar's index column. */
  code: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "index", code: "00" },
  { href: "/explore", label: "explore", code: "01" },
  { href: "/submit", label: "submit", code: "02" },
];

/** `/` matches only itself; everything else matches its subtree. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
