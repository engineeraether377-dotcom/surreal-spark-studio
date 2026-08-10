import { useState } from "react";
import { Reveal } from "@/components/Reveal";

const layers = [
  { id: 1, name: "Biocompatible enclosure", spec: "Parylene-C over Ti-6Al-4V · 180 µm wall" },
  { id: 2, name: "Ultrasonic transducer array", spec: "64-element PMUT ring · 1.1–2.4 MHz steering" },
  { id: 3, name: "Neural signal ASIC", spec: "1,024 ch · 18-bit · 3.1 µW/ch" },
  { id: 4, name: "Flexible interconnect", spec: "Polyimide 8-layer · 12 µm pitch" },
  { id: 5, name: "Power & telemetry module", spec: "Acoustic harvesting · 6.2 Mb/s uplink" },
  { id: 6, name: "Neural interface mesh", spec: "Graphene-carbon mesh · 4 µm electrodes" },
];

export function NimbleSection() {
  const [active, setActive] = useState(3);

  return (
    <section id="nimble" className="relative border-t border-hair py-[clamp(5rem,10vw,9rem)]">
      <div className="mx-auto w-full max-w-7xl px-6">
        <Reveal>
          <p className="t-marker text-ash">Instrument programme</p>
          <h2 className="mt-4 max-w-3xl text-balance text-[clamp(2.1rem,4.6vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            NIMBLE — a neuro-nanorobotic interface that travels, listens and leaves nothing behind.
          </h2>
          <p className="mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-ash">
            Six engineered layers, 2.4 mm end to end. NIMBLE is guided acoustically through the
            vasculature, resolves single-junction activity in living tissue, and reports continuously
            without a craniotomy.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <Reveal delay={80}>
            <div className="scope instrument relative overflow-hidden rounded-2xl border border-foreground/12 p-6">
              <div className="grid-fine pointer-events-none absolute inset-0 opacity-40" />
              <svg viewBox="0 0 420 300" className="relative block w-full" role="img" aria-label="NIMBLE exploded assembly">
                <defs>
                  <linearGradient id="nimbleShell" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.28)" />
                  </linearGradient>
                </defs>
                {layers.map((l, i) => {
                  const y = 34 + i * 42;
                  const on = active === l.id;
                  return (
                    <g
                      key={l.id}
                      onMouseEnter={() => setActive(l.id)}
                      style={{ cursor: "pointer", transition: "opacity 400ms ease" }}
                      opacity={on ? 1 : 0.42}
                    >
                      <ellipse
                        cx="150"
                        cy={y}
                        rx={96 - i * 4}
                        ry={16 - i * 0.6}
                        fill={on ? "url(#nimbleShell)" : "none"}
                        fillOpacity={on ? 0.16 : 0}
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth={on ? 1.4 : 0.8}
                      />
                      <line x1="248" y1={y} x2="300" y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
                      <circle cx="300" cy={y} r={on ? 3 : 1.6} fill="rgba(255,255,255,0.9)" />
                      <text x="312" y={y + 3.5} fill="rgba(255,255,255,0.8)" fontSize="9" fontFamily="monospace">
                        0{l.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="relative mt-4 flex items-center justify-between">
                <span className="t-marker text-foreground/70">NIMBLE rev. 4 · exploded</span>
                <span className="t-num text-[0.72rem] text-foreground/70">2.41 mm · 0.9 g</span>
              </div>
            </div>
          </Reveal>

          <div>
            <ul className="divide-y divide-hair border-y border-hair">
              {layers.map((l) => {
                const on = active === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(l.id)}
                      onFocus={() => setActive(l.id)}
                      onClick={() => setActive(l.id)}
                      className="group flex w-full items-baseline gap-5 py-5 text-left"
                    >
                      <span className="t-num w-8 shrink-0 text-[0.78rem] text-ash">0{l.id}</span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block text-[1.02rem] font-medium tracking-[-0.01em]"
                          style={{ opacity: on ? 1 : 0.62, transition: "opacity 350ms ease" }}
                        >
                          {l.name}
                        </span>
                        <span
                          className="mt-1 block font-mono text-[0.74rem] text-ash"
                          style={{
                            maxHeight: on ? 40 : 0,
                            opacity: on ? 1 : 0,
                            overflow: "hidden",
                            transition: "all 450ms cubic-bezier(0.16,1,0.3,1)",
                          }}
                        >
                          {l.spec}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { k: "Channels", v: "1,024" },
                { k: "Latency", v: "3.4 ms" },
                { k: "Footprint", v: "2.41 mm" },
              ].map((m) => (
                <div key={m.k} className="border-t border-hair pt-3">
                  <p className="t-num text-[1.2rem] font-semibold">{m.v}</p>
                  <p className="t-marker mt-1 text-ash">{m.k}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
