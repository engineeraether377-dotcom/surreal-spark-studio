import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-mark.png.asset.json";

const links = [
  { label: "Technology", to: "/", hash: "divisions" },
  { label: "Frontiers", to: "/", hash: "frontiers" },
  { label: "Research", to: "/research", hash: undefined },
  { label: "Analytics", to: "/", hash: "analytics" },
  { label: "About", to: "/about", hash: undefined },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-foreground/10 bg-paper/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-[1500px] items-center gap-6 px-[clamp(1.25rem,4vw,3.5rem)] py-3">
        <Link to="/" aria-label="Cognivance Labs — home" className="flex min-w-0 items-center">
          <img
            src={logo.url}
            alt="Cognivance Labs mark"
            width={120}
            height={120}
            className="h-[clamp(2.5rem,4.5vw,3.5rem)] w-auto shrink-0 object-contain"
          />
        </Link>

        <ul className="ml-auto hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <Link
                to={l.to}
                {...(l.hash ? { hash: l.hash } : {})}
                className="rule-link text-[0.9rem] font-medium text-ash transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          to="/"
          hash="waitlist"
          className="ml-auto hidden shrink-0 rounded-full bg-foreground px-5 py-2.5 text-[0.85rem] font-semibold text-primary-foreground transition-opacity hover:opacity-85 lg:ml-0 lg:block"
        >
          Join the waitlist
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="ml-auto flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-[5px] rounded-full border border-foreground/15 lg:hidden"
        >
          <span
            className={`h-px w-4 bg-foreground transition-transform duration-300 ${open ? "translate-y-[3px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-4 bg-foreground transition-transform duration-300 ${open ? "-translate-y-[3px] -rotate-45" : ""}`}
          />
        </button>
      </nav>

      <div
        className={`overflow-hidden border-t border-foreground/10 bg-paper/95 backdrop-blur-xl transition-[max-height] duration-500 lg:hidden ${
          open ? "max-h-[26rem]" : "max-h-0 border-t-0"
        }`}
      >
        <ul className="px-[clamp(1.25rem,4vw,3.5rem)] py-4">
          {links.map((l) => (
            <li key={l.label} className="border-b border-foreground/8 last:border-0">
              <Link
                to={l.to}
                {...(l.hash ? { hash: l.hash } : {})}
                onClick={() => setOpen(false)}
                className="block py-3.5 text-[1.05rem] font-medium text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="pt-4">
            <Link
              to="/"
              hash="waitlist"
              onClick={() => setOpen(false)}
              className="block rounded-full bg-foreground px-5 py-3 text-center text-[0.9rem] font-semibold text-primary-foreground"
            >
              Join the waitlist
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
