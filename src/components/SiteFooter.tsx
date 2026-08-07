import closing from "@/assets/closing.jpg";
import logo from "@/assets/logo.png.asset.json";

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
      <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-xl border border-border shadow-[var(--shadow-lift)]">
        <img
          src={closing}
          alt="Luminous interior of pale neural tissue"
          width={1920}
          height={1088}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-paper/55" />
        <div className="relative grid gap-10 px-[clamp(1.5rem,4vw,3.5rem)] pt-[clamp(2.5rem,6vw,5rem)] md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={logo.url}
              alt=""
              width={30}
              height={30}
              loading="lazy"
              className="h-[30px] w-[30px] shrink-0 object-contain"
            />
            <span className="t-marker text-ash">An institute of neuronanotechnology</span>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
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
                <li key={p} className="text-foreground/80">
                  {p}
                </li>
              ))}
            </FooterColumn>
            <FooterColumn title="Funding">
              {funding.map((f) => (
                <li key={f} className="text-foreground/80">
                  {f}
                </li>
              ))}
              <li className="pt-3">
                <a
                  href="mailto:contact@cognivancelabs.com"
                  className="inline-flex items-center rounded-full border border-foreground/25 px-4 py-2 text-[0.85rem] text-foreground transition-colors hover:border-synapse hover:text-synapse"
                >
                  Send a message
                </a>
              </li>
            </FooterColumn>
          </div>
        </div>
        <div className="relative select-none px-[clamp(1rem,3vw,2.5rem)] pt-6">
          <p
            className="whitespace-nowrap bg-gradient-to-b from-foreground/85 to-foreground/10 bg-clip-text text-center font-semibold leading-[0.82] tracking-[-0.045em] text-transparent"
            style={{ fontSize: "clamp(2rem, 11.8vw, 11.5rem)" }}
          >

            COGNIVANCE
          </p>
        </div>
      </div>
      <div className="mx-auto mt-6 flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-[clamp(0.5rem,2vw,1.5rem)] text-[0.8rem] text-ash">
        <span className="font-semibold text-foreground">Cognivance Labs</span>
        <span>Neuronanotechnology · Europe</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="t-marker border-b border-foreground/20 pb-2 text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-[0.95rem]">{children}</ul>
    </div>
  );
}
