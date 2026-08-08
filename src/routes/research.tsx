import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import {
  EEGTrace,
  LiveBadge,
  Metric,
  MRIScan,
  RiskCurve,
  SynapseField,
  Tractography,
} from "@/components/research-viz";

const title = "Research Console — Cognivance Labs";
const description =
  "A real-time demonstration of synaptic mapping, neural circuit reconstruction and pre-symptomatic disease prediction, streaming MRI, 3D tractography and EEG side by side.";

export const Route = createFileRoute("/research")({
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
  component: Research,
});

const modes = [
  {
    id: "synaptic",
    n: "01",
    label: "Synaptic Mapping",
    claim: "Individual junctions resolved in living tissue, in real time.",
    detail:
      "Nanorobotic agents traverse cortical tissue while MRI provides volumetric registration, tractography constrains the pathway, and the cortical channel array timestamps every event. The synaptic field is measured — not inferred from a haemodynamic proxy.",
    metrics: [
      { label: "Resolution", value: 18.4, unit: "nm", jitter: 0.6 },
      { label: "Events / s", value: 12840, unit: "", jitter: 0 },
      { label: "Registration err.", value: 0.31, unit: "mm", jitter: 0.2 },
      { label: "Confidence", value: 98.7, unit: "%", jitter: 0.6 },
    ],
  },
  {
    id: "circuit",
    n: "02",
    label: "Neural Circuit Reconstruction",
    claim: "Circuits rebuilt from traversal data, not imaging approximations.",
    detail:
      "Every streamline you see is anchored to a physical path an instrument has travelled. Diffusion tractography seeds the hypothesis; traversal telemetry corrects it; the reconstructed graph is validated against ground-truth histology at each node.",
    metrics: [
      { label: "Fidelity vs histology", value: 94.1, unit: "%", jitter: 0.5 },
      { label: "Streamlines", value: 36842, unit: "", jitter: 0 },
      { label: "Nodes resolved", value: 8412, unit: "", jitter: 0 },
      { label: "Rebuild latency", value: 1.8, unit: "s", jitter: 0.4 },
    ],
  },
  {
    id: "predict",
    n: "03",
    label: "Pre-Symptomatic Prediction",
    claim: "Degeneration signatures detected years before clinical onset.",
    detail:
      "Longitudinal traversal data is projected into a degeneration-signature space. The trajectory departs from the healthy manifold long before structural imaging or clinical scoring registers anything at all — the lead time is the product.",
    metrics: [
      { label: "Lead time", value: 6.4, unit: "yrs", jitter: 0.3 },
      { label: "Sensitivity", value: 91.2, unit: "%", jitter: 0.8 },
      { label: "Specificity", value: 88.6, unit: "%", jitter: 0.8 },
      { label: "Cohort", value: 1306, unit: "", jitter: 0 },
    ],
  },
] as const;

function Research() {
  const [active, setActive] = useState<(typeof modes)[number]["id"]>("synaptic");
  const mode = modes.find((m) => m.id === active) ?? modes[0];

  return (
    <div className="min-h-screen bg-paper">
      <SiteNav />

      <section className="haze grain px-[clamp(1.25rem,4vw,3.5rem)] pt-[clamp(8rem,16vw,11rem)] pb-[clamp(2rem,5vw,3.5rem)]">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-center gap-4">
            <p className="t-marker text-ash">Research console</p>
            <LiveBadge />
          </div>
          <h1 className="t-hero rise mt-7 max-w-[22ch] text-foreground">
            The instrument, running live.
          </h1>
          <p className="t-lead rise mt-7 max-w-[58ch] text-foreground/80" style={{ animationDelay: "150ms" }}>
            Three capabilities, streamed side by side: MRI volumetric registration, 3D
            white-matter tractography and a cortical channel array — fused into one measurement
            surface.
          </p>
        </div>
      </section>

      {/* mode switch */}
      <section className="sticky top-[4.25rem] z-40 border-y border-foreground/10 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-[clamp(1.25rem,4vw,3.5rem)] py-3">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(m.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[0.82rem] font-medium transition-colors ${
                active === m.id
                  ? "border-foreground bg-foreground text-primary-foreground"
                  : "border-foreground/15 text-ash hover:text-foreground"
              }`}
            >
              <span className="t-num mr-2 opacity-60">{m.n}</span>
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* console */}
      <section className="px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(2.5rem,6vw,4.5rem)]">
        <div className="mx-auto max-w-[1500px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)]">
            {/* left: fused viewports */}
            <div className="min-w-0 rounded-2xl border border-foreground/12 bg-veil p-[clamp(1rem,2vw,1.5rem)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-marker text-ash">Fused acquisition — {mode.label}</p>
                <span className="t-num text-[0.72rem] text-ash">
                  MRI · DTI · EEG synchronised @ 1.2 kHz
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MRIScan label={active === "predict" ? "T1 / longitudinal" : "T1 / axial"} />
                {active === "synaptic" ? <SynapseField /> : <Tractography bindings-key="t" bundles={active === "circuit" ? 30 : 22} />}
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-foreground/12 bg-black">
                <div className="flex items-center justify-between gap-3 border-b border-foreground/10 px-3 py-2">
                  <span className="t-marker text-foreground/70">
                    {active === "predict" ? "EEG · longitudinal montage" : "EEG · 64-ch montage"}
                  </span>
                  <span className="t-num text-[0.72rem] text-foreground/60">
                    {active === "circuit" ? "band 8–13 Hz" : "band 0.5–120 Hz"}
                  </span>
                </div>
                <EEGTrace channels={active === "circuit" ? 8 : 6} height={190} speed={active === "predict" ? 0.6 : 1} />
              </div>

              {active === "predict" ? (
                <div className="mt-4">
                  <RiskCurve />
                </div>
              ) : null}
            </div>

            {/* right: readout */}
            <aside className="min-w-0 space-y-6">
              <div className="rounded-2xl border border-foreground/12 bg-veil p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <p className="t-marker text-ash">{mode.n} / Capability</p>
                <h2 className="mt-4 font-semibold tracking-[-0.03em] text-foreground [font-size:clamp(1.35rem,2.4vw,1.9rem)]">
                  {mode.label}
                </h2>
                <p className="mt-3 text-[0.95rem] font-medium leading-relaxed text-foreground/80">
                  {mode.claim}
                </p>
                <p className="mt-4 text-[0.88rem] leading-relaxed text-ash">{mode.detail}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {mode.metrics.map((m) => (
                  <Metric
                    key={m.label}
                    label={m.label}
                    value={m.value}
                    {...(m.unit ? { unit: m.unit } : {})}
                    jitter={m.jitter}
                  />
                ))}
              </div>

              <div className="rounded-2xl border border-foreground/12 bg-veil p-[clamp(1.25rem,2.5vw,1.75rem)]">
                <p className="t-marker text-ash">Pipeline</p>
                <ol className="mt-5 space-y-4">
                  {[
                    "Volumetric registration (MRI)",
                    "Pathway constraint (3D tractography)",
                    "Traversal telemetry (nanorobotic agents)",
                    "Event timestamping (cortical array)",
                    active === "predict" ? "Signature projection" : "Graph reconstruction",
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="t-num mt-0.5 text-[0.7rem] text-ash">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 text-[0.9rem] text-foreground/85">{step}</span>
                      <span className="live-dot mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" style={{ animationDelay: `${i * 260}ms` }} />
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>

          <Reveal delay={120}>
            <p className="mx-auto mt-[clamp(2.5rem,5vw,4rem)] max-w-[60ch] text-center text-[0.85rem] leading-relaxed text-ash">
              Demonstration console. Streams are synthesised from recorded acquisition profiles for
              presentation; the pipeline, resolutions and reconstruction stages mirror the live
              laboratory system.
            </p>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
