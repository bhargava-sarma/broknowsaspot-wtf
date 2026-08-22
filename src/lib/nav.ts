export type NavItem = {
  href: string;
  label: string;
  /**
   * The icon, as a single SVG path.
   *
   * One path rather than a group so it can be bound to a `d` attribute
   * on a shared `<svg>` wrapper — every icon then inherits the same
   * size, stroke width and colour from one place, and adding a
   * destination is one line rather than a new component.
   */
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Index",
    icon: "M4 11l8-7 8 7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
  },
  {
    href: "/explore",
    label: "Explore",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5l-2 5-5 2 2-5z",
  },
  {
    href: "/submit",
    label: "Submit",
    icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8.5v7M8.5 12h7",
  },
];

/** `/` matches only itself; everything else matches its subtree. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
