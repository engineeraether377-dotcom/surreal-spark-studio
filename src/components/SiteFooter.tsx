import closing from "@/assets/closing.jpg";
import logo from "@/assets/logo-mark.png.asset.json";

const menu = [
  { label: "The Problem", href: "#problem" },
  { label: "Divisions", href: "#divisions" },
  { label: "Frontiers", href: "#frontiers" },
  { label: "The Map", href: "#map" },
  { label: "Team", href: "#team" },
];

const partners = ["Germany", "Switzerland", "Norway", "Sweden", "United Kingdom"];

const funding = ["Horizon Europe", "ERC Synergy", "SNF", "UKRI"];

export function SiteFooter() {
  return (
    <footer className="px-[clamp(0.75rem,2.5vw,2rem)] pb-[clamp(0.75rem,2.5vw,2rem)]">
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-lift)]">
        <img
          src={closing}
          alt=""
          width={1920}
          height={1088}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-paper/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-paper/40 via-transparent to-paper/85" />

        <div className="relative px-[clamp(1.25rem,4vw,3.5rem)] pt-[clamp(2.25rem,5vw,4rem)]">
          {/* top band */}
          <div className="grid gap-8 border-b border-foreground/12 pb-[clamp(1.75rem,4vw,3rem)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={logo.url}
                alt=""
                width={120}
                height={120}
                loading="lazy"
                className="h-14 w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="t-marker text-synapse">An institute of neuronanotechnology</p>
                <p className="mt-2 max-w-[34ch] text-[0.95rem] leading-relaxed text-ash">
                  Mapping the brain inside-out — nanorobotic systems and computational
                  neuroscience in one engine.
                </p>
              </div>
            </div>
            <a
              href="mailto:contact@cognivancelabs.com"
              className="group inline-flex items-center gap-3 self-start rounded-full border border-foreground/20 bg-paper/60 px-5 py-3 text-[0.9rem] font-medium text-foreground backdrop-blur-sm transition-colors hover:border-synapse hover:text-synapse md:self-end"
            >
              contact@cognivancelabs.com
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>

          {/* columns */}
          <div className="grid gap-x-10 gap-y-8 py-[clamp(1.75rem,4vw,3rem)] sm:grid-cols-3">
            <FooterColumn title="Menu">
              {menu.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="rule-link text-foreground/80 hover:text-synapse">
                    {item.label}
                  </a>
                </li>
              ))}
            </FooterColumn>
            <FooterColumn title="Partnerships">
              {partners.map((p) => (
                <li key={p} className="text-foreground/75">
                  {p}
                </li>
              ))}
            </FooterColumn>
            <FooterColumn title="Funding">
              {funding.map((f) => (
                <li key={f} className="text-foreground/75">
                  {f}
                </li>
              ))}
            </FooterColumn>
          </div>
        </div>

        {/* wordmark */}
        <div className="relative select-none px-[clamp(0.75rem,2.5vw,2rem)]">
          <p
            className="whitespace-nowrap bg-gradient-to-b from-foreground/80 via-foreground/35 to-foreground/5 bg-clip-text text-center font-semibold leading-[0.78] tracking-[-0.05em] text-transparent"
            style={{ fontSize: "clamp(2rem, 11.6vw, 11.5rem)" }}
          >
            COGNIVANCE
          </p>
        </div>
      </div>

      <div className="mx-auto mt-5 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-[clamp(0.5rem,2vw,1.5rem)] text-[0.8rem] text-ash">
        <span className="font-semibold text-foreground">Cognivance Labs</span>
        <span>Neuronanotechnology · Europe</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="t-marker text-ash">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[0.95rem]">{children}</ul>
    </div>
  );
}
