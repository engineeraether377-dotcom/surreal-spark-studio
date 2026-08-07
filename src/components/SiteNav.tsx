import { useEffect, useState } from "react";
import logo from "@/assets/logo.png.asset.json";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border bg-paper/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-[clamp(1.25rem,4vw,3.5rem)] py-4">
        <a href="#top" className="flex min-w-0 items-center gap-2.5">
          <img
            src={logo.url}
            alt="Cognivance Labs mark"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="truncate text-[0.95rem] font-semibold tracking-[-0.02em] text-foreground">
            Cognivance Labs
          </span>
        </a>
        <a
          href="mailto:contact@cognivancelabs.com"
          className="rule-link shrink-0 text-[0.9rem] text-ash transition-colors hover:text-synapse"
        >
          Contact
        </a>
      </nav>
    </header>
  );
}
