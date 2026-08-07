import { createFileRoute } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import heroAsset from "@/assets/hero.png.asset.json";
import ansab from "@/assets/ansab.jpeg.asset.json";
import rayyan from "@/assets/rayyan.jpeg.asset.json";
import hadeera from "@/assets/hadeera.jpeg.asset.json";
import ruhma from "@/assets/ruhma.jpg.asset.json";
import gulfam from "@/assets/gulfam.jpeg.asset.json";
import divisionNano from "@/assets/division-nano.jpg";
import divisionComp from "@/assets/division-comp.jpg";
import f1 from "@/assets/f1.jpg";
import f2 from "@/assets/f2.jpg";
import f3 from "@/assets/f3.jpg";
import f4 from "@/assets/f4.jpg";
import f5 from "@/assets/f5.jpg";
import closing from "@/assets/closing.jpg";

const title = "Cognivance Labs — Institute of Neuronanotechnology";
const description =
  "Nanorobotic systems and computational neuroscience in one engine: mapping synapses in living tissue and modelling neurodegeneration before the first symptom.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const frontiers = [
  {
    n: "01",
    img: f1,
    alt: "Points of contact between translucent organic filaments",
    title: "Real-Time Synaptic Mapping",
    claim:
      "Individual synaptic junctions mapped in living tissue — not inferred from imaging averages.",
    body: "Every existing method for studying synaptic activity is a translation. fMRI translates blood flow into signal. EEG translates surface voltage into guesswork. We map the synapse itself, in living tissue, in real time. No translation layer. No inference. The junction, as it is, as it fires, as it changes.",
  },
  {
    n: "02",
    img: f2,
    alt: "An intact pale membrane with the first faint traces of erosion",
    title: "Pre-Symptomatic Neurodegeneration",
    claim: "Computational models detect disease signatures years before clinical symptoms appear.",
    body: "By the time a neurodegenerative disease is diagnosed, the damage has been accumulating for years — sometimes decades. Our models, trained on nanorobotic traversal data, identify the earliest computational signatures of degeneration. Not a biomarker. A pattern. The disease, before it becomes a disease.",
  },
  {
    n: "03",
    img: f3,
    alt: "A single teal droplet held inside a dense field of pale fibers",
    title: "Sub-Cellular Intervention",
    claim: "Targeted delivery of molecular instructions — not drugs — to specific neural circuits.",
    body: "Drugs are broadcast signals. They reach the target tissue and everything around it. We deliver instructions — molecular payloads carried by nanorobotic systems to specific circuits, specific synapses, specific cells. Not a flood. A message, delivered to the exact address.",
  },
  {
    n: "04",
    img: f4,
    alt: "Fragments of a pale organic structure reassembling",
    title: "First-Principles Circuit Reconstruction",
    claim: "Neural circuits rebuilt from nanorobotic traversal data, not from MRI approximations.",
    body: "Every existing map of neural circuitry is an approximation — a statistical guess built from low-resolution imaging. We reconstruct circuits from the ground up, using the physical traversal data from nanorobotic systems that have moved through the tissue itself. Not a map drawn from above. A model built from within.",
  },
  {
    n: "05",
    img: f5,
    alt: "A single coherent thread of light running through dense texture",
    title: "Intent-Reading BCI",
    claim: "A new class of brain-computer interface that reads cognitive intent, not voltage spikes.",
    body: "Current BCIs read the brain's electrical noise and translate it into commands. We read the computational structure of intent itself — the pattern that precedes the signal, the decision before the firing. Not a faster interface. A fundamentally different one.",
  },
];

const team = [
  { name: "Ansab Butt", role: "Chief Executive Officer", img: ansab.url },
  { name: "Muhammad Rayyan", role: "Chief AI Research Scientist", img: rayyan.url },
  { name: "Hadeera Ansari", role: "Chief Research Scientist", img: hadeera.url },
  { name: "Ruhma Naveed", role: "Founding Research Engineer", img: ruhma.url },
  { name: "Gulfam", role: "Founding Full-Stack Engineer", img: gulfam.url },
];

const partnerships = ["Germany", "Switzerland", "Norway", "Sweden", "United Kingdom"];
const fundingPaths = [
  "Horizon Europe",
  "ERC Synergy",
  "SNF",
  "Research Council of Norway",
  "Vetenskapsrådet",
  "UKRI",
];

function Index() {
  return (
    <div id="top" className="min-h-screen bg-paper">
      <SiteNav />

      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-svh items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroAsset.url}
            alt="Translucent brain suspended in a luminous dawn landscape, threaded with sub-cellular instruments"
            width={1664}
            height={936}
            className="drift-slow h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/92 via-paper/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
        </div>

        <div className="relative w-full px-[clamp(1.5rem,5vw,4rem)] pt-28 pb-20">
          <div className="max-w-[900px]">
            <p className="t-marker rise text-synapse" style={{ animationDelay: "80ms" }}>
              Institute of Neuronanotechnology
            </p>
            <h1 className="t-hero rise mt-6 text-foreground">
              The last frontier of science is between your ears.
            </h1>
            <p
              className="t-lead rise mt-6 max-w-[46ch] text-foreground/80"
              style={{ animationDelay: "150ms" }}
            >
              Cognivance Labs is an institute of neuronanotechnology engineering the tools
              neuroscience has never had — and solving the problems it long declared unsolvable.
            </p>
            <div
              className="rise mt-9 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "300ms" }}
            >
              <a
                href="#frontiers"
                className="rounded-[4px] bg-synapse px-8 py-3.5 text-[0.95rem] font-semibold text-primary-foreground transition-colors hover:bg-synapse-dim"
              >
                Read the science
              </a>
              <a
                href="#divisions"
                className="rule-link text-[0.95rem] text-foreground transition-colors hover:text-synapse"
              >
                See what we're building
              </a>
            </div>
            <p className="rise mt-8 text-[0.85rem] text-ash" style={{ animationDelay: "420ms" }}>
              Nanorobotic systems. Computational neuroscience. One integrated engine.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Problem ---------- */}
      <section id="problem" className="haze grain bg-veil px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,10vw,9rem)]">
        <div className="mx-auto max-w-[720px]">
          <Reveal>
            <p className="t-marker text-synapse">The problem, stated without flattery</p>
          </Reveal>
          <div className="mt-8 space-y-7">
            <Reveal delay={80}>
              <p className="t-body text-foreground">
                Neuroscience has been working with instruments designed for a different era. MRI
                shows you averages. EEG shows you surface noise. Patch clamps show you one cell at a
                time. The hardest problems in the field were never unsolvable — they were
                under-tooled.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p className="t-body text-foreground">
                We build the tools that were missing. Nanorobotic systems that navigate neural tissue
                at sub-cellular resolution. Computational frameworks that make sense of what those
                instruments find. Not two teams working in parallel — one engine, designed from the
                first principle that you cannot understand what you cannot measure, and you cannot
                measure what you cannot reach.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <p className="t-body text-ash">
                The result is a class of neuroscience that did not exist before. Not better imaging.
                Not faster analysis. A fundamentally new relationship between instruments and the
                tissue they study.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Divisions ---------- */}
      <section id="divisions" className="px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,10vw,9rem)]">
        <div className="mx-auto grid max-w-[1440px] gap-[clamp(2.5rem,5vw,4rem)] md:grid-cols-2">
          <Division
            n="01"
            img={divisionNano}
            alt="A translucent filament threading through pale golden tissue"
            title="Nanorobotic Systems"
            body="Autonomous agents navigating neural tissue at sub-cellular resolution. Powered by the body's own biochemistry. Guided by acoustic gradients. Reprogrammable in real time. These are not probes — they are instruments that live inside the tissue they study."
          />
          <Division
            n="02"
            delay={120}
            img={divisionComp}
            alt="A crystalline lattice emerging out of soft organic tissue"
            title="Computational Neuroscience"
            body="Mathematical frameworks that make sense of what those instruments find. Novel models of synaptic dynamics. Simulations of neurodegeneration before the first clinical symptom. Frameworks for emergent cognition that existing tools cannot represent."
          />
        </div>
        <Reveal delay={200}>
          <p className="mx-auto mt-[clamp(2.5rem,5vw,4rem)] max-w-[640px] text-center text-[0.95rem] text-ash">
            One system. The nanorobots generate the data. The computation interprets it.
          </p>
        </Reveal>
      </section>

      {/* ---------- Frontiers ---------- */}
      <section
        id="frontiers"
        className="haze grain bg-veil px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,10vw,9rem)]"
      >
        <div className="mx-auto max-w-[1180px]">
          <Reveal>
            <h2 className="t-section text-center text-foreground">Five Frontiers</h2>
            <p className="mx-auto mt-4 max-w-[620px] text-center text-[0.95rem] text-ash">
              The digital products we are building — each one a problem neuroscience declared
              unsolvable.
            </p>
          </Reveal>

          <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-4 md:grid-cols-3">
            <BentoCard f={frontiers[0]!} variant="wide" className="md:col-span-3" />
            <BentoCard f={frontiers[1]!} delay={80} />
            <BentoCard f={frontiers[2]!} delay={140} variant="halo" />
            <BentoCard f={frontiers[3]!} delay={200} />
            <BentoCard f={frontiers[4]!} delay={260} variant="feature" className="md:col-span-3" />
          </div>
        </div>
      </section>


      {/* ---------- The Map ---------- */}
      <section id="map" className="px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,10vw,9rem)]">
        <div className="mx-auto max-w-[1080px]">
          <Reveal>
            <h2 className="t-section text-foreground">The Map</h2>
          </Reveal>
          <div className="mt-[clamp(2rem,4vw,3.5rem)] grid gap-[clamp(2.5rem,5vw,5rem)] md:grid-cols-2">
            <Reveal delay={80}>
              <p className="t-marker text-ash">Research partnerships</p>
              <ul className="mt-5">
                {partnerships.map((p) => (
                  <li
                    key={p}
                    className="border-b border-border py-3.5 text-[1.05rem] font-medium text-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={160}>
              <p className="t-marker text-ash">Funding pathways</p>
              <ul className="mt-5">
                {fundingPaths.map((p) => (
                  <li
                    key={p}
                    className="border-b border-border py-3.5 text-[1.05rem] font-medium text-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Team ---------- */}
      <section
        id="team"
        className="haze grain bg-veil px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,10vw,9rem)]"
      >
        <div className="mx-auto max-w-[1180px]">
          <Reveal>
            <p className="t-marker text-center text-synapse">The people</p>
            <h2 className="t-section mt-4 text-center text-foreground">The Team</h2>
            <p className="mx-auto mt-4 max-w-[600px] text-center text-[0.95rem] text-ash">
              A small team building instruments that did not exist, for problems that were declared
              unsolvable.
            </p>
          </Reveal>

          <div className="mt-[clamp(2.5rem,5vw,4rem)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 90} className={i === 0 ? "lg:col-span-2" : ""}>
                <figure className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]">
                  <img
                    src={m.img}
                    alt={`${m.name}, ${m.role}`}
                    width={1200}
                    height={1500}
                    loading="lazy"
                    className={`w-full object-cover object-top grayscale transition-all duration-700 group-hover:scale-[1.03] group-hover:grayscale-0 ${
                      i === 0 ? "aspect-[4/5] lg:aspect-[16/11]" : "aspect-[4/5]"
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-paper via-paper/70 to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(1rem,2vw,1.75rem)]">
                    <div className="min-w-0">
                      <p className="t-marker text-synapse">{String(i + 1).padStart(2, "0")}</p>
                      <h3
                        className={`mt-2 font-semibold tracking-[-0.025em] text-foreground ${
                          i === 0
                            ? "[font-size:clamp(1.5rem,3vw,2.25rem)]"
                            : "[font-size:clamp(1.2rem,2vw,1.5rem)]"
                        }`}
                      >
                        {m.name}
                      </h3>
                      <p className="mt-1 text-[0.95rem] font-medium text-ash">{m.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* ---------- Closing ---------- */}
      <section className="relative flex min-h-[80svh] items-center justify-center overflow-hidden">
        <img
          src={closing}
          alt="A luminous cathedral-like interior of pale neural tissue"
          width={1920}
          height={1088}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-paper/45" />
        <Reveal className="relative px-[clamp(1.5rem,5vw,4rem)]">
          <p className="mx-auto max-w-[800px] text-center font-semibold leading-[1.1] tracking-[-0.02em] text-foreground [font-size:clamp(2rem,5vw,4rem)]">
            The brain is the last great frontier of science. We intend to map it inside-out.
          </p>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

function Division({
  n,
  img,
  alt,
  title,
  body,
  delay = 0,
}: {
  n: string;
  img: string;
  alt: string;
  title: string;
  body: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="overflow-hidden rounded-lg border border-border shadow-[var(--shadow-soft)]">
        <img
          src={img}
          alt={alt}
          width={1280}
          height={960}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      <p className="t-marker mt-7 text-synapse">{n}</p>
      <h3 className="mt-3 font-semibold tracking-[-0.02em] text-foreground [font-size:clamp(1.5rem,2.5vw,2rem)]">
        {title}
      </h3>
      <p className="mt-4 max-w-[46ch] text-[1rem] leading-relaxed text-ash">{body}</p>
    </Reveal>
  );
}

type Frontier = (typeof frontiers)[number];

function BentoCard({
  f,
  variant = "small",
  className = "",
  delay = 0,
}: {
  f: Frontier;
  variant?: "small" | "wide" | "halo" | "feature";
  className?: string;
  delay?: number;
}) {
  const isFeature = variant === "feature";
  const isWide = variant === "wide";

  return (
    <Reveal delay={delay} className={className}>
      <article
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl p-[clamp(1.25rem,2.2vw,2rem)] transition-all duration-500 ${
          isFeature
            ? "bg-synapse text-primary-foreground shadow-[var(--shadow-lift)]"
            : "glass hover:shadow-[var(--shadow-lift)]"
        } ${variant === "halo" ? "ring-2 ring-synapse/45" : ""} ${
          isWide ? "min-h-[240px] sm:min-h-[280px]" : isFeature ? "min-h-[220px]" : "min-h-[340px]"
        }`}
      >
        {/* imagery */}
        <img
          src={f.img}
          alt={f.alt}
          width={640}
          height={640}
          loading="lazy"
          className={
            isWide
              ? "pointer-events-none absolute right-0 top-0 h-full w-[46%] object-cover opacity-70 transition-transform duration-700 [mask-image:linear-gradient(to_left,black,transparent)] group-hover:scale-[1.04]"
              : isFeature
                ? "pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity"
                : "pointer-events-none absolute inset-x-0 top-0 h-[45%] w-full object-cover opacity-55 transition-transform duration-700 [mask-image:linear-gradient(to_top,transparent,black)] group-hover:scale-[1.05]"
          }
        />

        <div className={`relative ${isWide ? "max-w-[58%]" : ""}`}>
          <p
            className={`t-marker ${isFeature ? "text-primary-foreground/80" : "text-synapse"}`}
          >
            {f.n} · {isFeature ? "Frontier" : "Frontier"}
          </p>
          <h3
            className={`mt-3 font-semibold leading-[1.08] tracking-[-0.03em] ${
              isWide
                ? "[font-size:clamp(1.6rem,3.2vw,2.6rem)]"
                : "[font-size:clamp(1.2rem,1.9vw,1.6rem)]"
            } ${isFeature ? "text-primary-foreground" : "text-foreground"}`}
          >
            {f.title}
          </h3>
          <p
            className={`mt-3 text-[0.95rem] leading-snug ${
              isFeature ? "text-primary-foreground/90" : "text-foreground/85"
            }`}
          >
            {f.claim}
          </p>
        </div>

        <div className="relative mt-auto flex items-end justify-between gap-4 pt-6">
          <p
            className={`max-w-[52ch] text-[0.85rem] leading-relaxed ${
              isFeature ? "text-primary-foreground/75" : "text-ash"
            } ${isWide ? "" : "line-clamp-4"}`}
          >
            {f.body}
          </p>
          <span
            aria-hidden
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:translate-x-1 ${
              isFeature
                ? "border-primary-foreground/50 text-primary-foreground"
                : "border-foreground/25 text-foreground"
            }`}
          >
            →
          </span>
        </div>
      </article>
    </Reveal>
  );
}

