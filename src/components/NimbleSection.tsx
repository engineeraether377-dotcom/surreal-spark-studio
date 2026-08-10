import { useState } from "react";
import { Reveal } from "@/components/Reveal";

const layers = [
  {
    id: 1,
    name: "Biocompatible enclosure",
    short: "Hermetically sealed titanium and Parylene-C casing.",
    spec: "Parylene-C over Ti-6Al-4V · 180 µm wall",
  },
  {
    id: 2,
    name: "Ultrasonic transducer array",
    short: "Custom MEMS transducers for acoustic nanorobot navigation.",
    spec: "64-element PMUT ring · 1.1–2.4 MHz steering",
  },
  {
    id: 3,
    name: "Neural signal ASIC",
    short: "Low-power neural signal processing and stimulation management SoC.",
    spec: "1,024 ch · 18-bit · 3.1 µW/ch",
  },
  {
    id: 4,
    name: "High-density interconnect",
    short: "Flexible biocompatible interposer for high-bandwidth data and power transmission.",
    spec: "Polyimide 8-layer · 12 µm pitch",
  },
  {
    id: 5,
    name: "Power management module",
    short: "Ultra-low power management with energy harvesting capabilities.",
    spec: "Acoustic harvesting · 6.2 Mb/s uplink",
  },
  {
    id: 6,
    name: "Neural interface",
    short: "High-density microelectrode array for neural signal acquisition and stimulation.",
    spec: "Graphene-carbon mesh · 4 µm electrodes",
  },
];

const metrics = [
  {
    value: "1,024",
    label: "Neural channels",
  },
  {
    value: "2.41 mm",
    label: "Device thickness",
  },
  {
    value: "3.4 ms",
    label: "System latency",
  },
];

const details = [
  {
    number: "01",
    title: "Hermetically sealed enclosure",
    description:
      "A compact protective architecture designed around biological integration and long-term device stability.",
    type: "enclosure",
  },
  {
    number: "02",
    title: "Neural signal ASIC",
    description:
      "Dedicated low-power electronics for high-density neural signal acquisition and processing.",
    type: "asic",
  },
  {
    number: "03",
    title: "Flexible interconnect",
    description:
      "Ultra-thin routing transitions from rigid electronics into the neural interface architecture.",
    type: "flex",
  },
  {
    number: "04",
    title: "Neural interface mesh",
    description:
      "Distributed microelectrode architecture designed for high-density neural interfacing.",
    type: "mesh",
  },
];

function DetailVisual({ type }: { type: string }) {
  if (type === "enclosure") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#070809]">
        <div className="absolute left-1/2 top-1/2 h-32 w-52 -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/40 bg-white/[0.035] shadow-[0_0_80px_rgba(255,255,255,.04)]">
          <div className="absolute inset-3 rounded-[25px] border border-white/10" />

          <div className="absolute left-4 top-4 h-2 w-2 rounded-full border border-white/40" />
          <div className="absolute right-4 top-4 h-2 w-2 rounded-full border border-white/40" />
          <div className="absolute bottom-4 left-4 h-2 w-2 rounded-full border border-white/40" />
          <div className="absolute bottom-4 right-4 h-2 w-2 rounded-full border border-white/40" />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.07),transparent_55%)]" />
      </div>
    );
  }

  if (type === "asic") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#070809]">
        <div className="absolute left-1/2 top-1/2 h-28 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#b58b3e]/50 bg-[#111315] p-3 shadow-[0_0_70px_rgba(181,139,62,.08)]">
          <div className="h-full w-full rounded-md border border-white/10 bg-[#08090a]">
            <div className="absolute left-1/2 top-1/2 h-14 w-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/15 bg-[#111315]" />
          </div>

          <div className="absolute -left-2 top-5 bottom-5 flex flex-col justify-between">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="h-[2px] w-2 bg-[#b58b3e]/70"
              />
            ))}
          </div>

          <div className="absolute -right-2 top-5 bottom-5 flex flex-col justify-between">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="h-[2px] w-2 bg-[#b58b3e]/70"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "flex") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#070809]">
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[5px]">
          {Array.from({ length: 13 }).map((_, i) => (
            <div
              key={i}
              className="h-32 w-[2px] origin-top rotate-[8deg] bg-gradient-to-b from-[#d6ad56] via-[#9c7329] to-transparent opacity-80"
              style={{
                transform: `rotate(${(i - 6) * 1.6}deg)`,
              }}
            />
          ))}
        </div>

        <div className="absolute left-1/2 top-[65%] h-12 w-40 -translate-x-1/2 rounded-md border border-[#b58b3e]/40 bg-[#111315]" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#070809]">
      <div className="absolute left-1/2 top-1/2 grid h-28 w-40 -translate-x-1/2 -translate-y-1/2 grid-cols-8 gap-1.5 opacity-80">
        {Array.from({ length: 64 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#b58b3e]"
          />
        ))}
      </div>

      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-px w-24 origin-left bg-gradient-to-r from-[#b58b3e]/70 to-transparent"
          style={{
            left: `${20 + (i % 6) * 11}%`,
            top: `${35 + (i % 5) * 8}%`,
            transform: `rotate(${i % 2 === 0 ? -25 : 25}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function NimbleSection() {
  const [active, setActive] = useState(3);

  const selectedLayer =
    layers.find((layer) => layer.id === active) ?? layers[2];

  return (
    <section
      id="nimble"
      className="relative overflow-hidden border-t border-white/[0.08] bg-[#050505] text-white"
    >
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[20%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-blue-500/[0.025] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-6 py-24 sm:px-8 md:px-10 lg:py-36">

        {/* =========================================================
            HEADER
        ========================================================== */}

        <Reveal>
          <div className="max-w-6xl">

            <div className="mb-8 flex items-center gap-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/35">
                Instrument Programme
              </span>

              <span className="h-px w-12 bg-white/15" />

              <span className="font-mono text-[9px] tracking-[0.28em] text-blue-400/80">
                NMBL / REV.04
              </span>
            </div>

            <h2 className="max-w-6xl text-balance text-[clamp(3rem,6.4vw,6.8rem)] font-medium leading-[0.91] tracking-[-0.055em]">
              NIMBLE — a
              <br />
              neuro-nanorobotic
              <br />
              interface that
              <br />
              <span className="text-white/35">
                disappears into the body.
              </span>
            </h2>

            <div className="mt-10 flex max-w-4xl flex-col gap-7 md:flex-row md:items-start">

              <p className="max-w-2xl text-[15px] leading-7 text-white/45">
                Six engineered layers form a compact neural interface for
                acoustic navigation, neural signal acquisition and
                high-density bidirectional communication.
              </p>

              <div className="hidden h-px w-16 bg-white/15 md:mt-3 md:block" />

              <p className="max-w-[180px] font-mono text-[9px] uppercase leading-5 tracking-[0.18em] text-white/25">
                Engineered for
                <br />
                biological integration
              </p>
            </div>
          </div>
        </Reveal>

        {/* =========================================================
            MAIN PRODUCT AREA
        ========================================================== */}

        <div className="mt-20 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] xl:gap-12">

          {/* =======================================================
              ACTUAL NIMBLE IMAGE
          ======================================================== */}

          <Reveal delay={100}>
            <div className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#050505]">

              <div className="relative aspect-[3/4] w-full">

                <img
                  src="/Nimble.png"
                  alt="NIMBLE neuro-nanorobotic interface — Cognivance Labs"
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-contain
                    transition-transform
                    duration-1000
                    ease-[cubic-bezier(.16,1,.3,1)]
                  "
                  style={{
                    transform:
                      active === 3
                        ? "scale(1.012)"
                        : "scale(1)",
                  }}
                />

                {/* extremely subtle vignette */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_52%,rgba(0,0,0,.28)_100%)]" />

                {/* top-left live indicator */}
                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.9)]" />

                  <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/45">
                    Engineering render
                  </span>
                </div>

                {/* image caption */}
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">

                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/30">
                      NIMBLE
                    </p>

                    <p className="mt-1 text-[11px] text-white/45">
                      Neuro-nanorobotic interface
                    </p>
                  </div>

                  <span className="font-mono text-[8px] tracking-[0.18em] text-white/25">
                    NMBL / 04
                  </span>
                </div>

              </div>
            </div>
          </Reveal>

          {/* =======================================================
              COMPONENT ARCHITECTURE
          ======================================================== */}

          <Reveal delay={160}>
            <div className="flex h-full min-h-[650px] flex-col">

              <div className="mb-2 flex items-center justify-between border-b border-white/[0.09] pb-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">
                  Component architecture
                </span>

                <span className="font-mono text-[9px] text-white/20">
                  06 LAYERS
                </span>
              </div>

              <div className="divide-y divide-white/[0.08]">

                {layers.map((layer) => {
                  const isActive = active === layer.id;

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onMouseEnter={() => setActive(layer.id)}
                      onFocus={() => setActive(layer.id)}
                      onClick={() => setActive(layer.id)}
                      className="group block w-full py-5 text-left outline-none"
                    >
                      <div className="flex gap-4">

                        {/* number */}

                        <span
                          className={`
                            pt-1
                            font-mono
                            text-[9px]
                            transition-colors
                            duration-300
                            ${
                              isActive
                                ? "text-blue-400"
                                : "text-white/20"
                            }
                          `}
                        >
                          0{layer.id}
                        </span>

                        {/* content */}

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-4">

                            <span
                              className={`
                                text-[14px]
                                font-medium
                                tracking-[-0.015em]
                                transition-colors
                                duration-300
                                ${
                                  isActive
                                    ? "text-white"
                                    : "text-white/45 group-hover:text-white/75"
                                }
                              `}
                            >
                              {layer.name}
                            </span>

                            <span
                              className={`
                                h-1.5
                                w-1.5
                                shrink-0
                                rounded-full
                                transition-all
                                duration-300
                                ${
                                  isActive
                                    ? "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.9)]"
                                    : "bg-white/10"
                                }
                              `}
                            />

                          </div>

                          {/* expandable description */}

                          <div
                            className="grid transition-all duration-500"
                            style={{
                              gridTemplateRows: isActive
                                ? "1fr"
                                : "0fr",
                            }}
                          >
                            <div className="overflow-hidden">

                              <p className="mt-2 max-w-md text-[11px] leading-5 text-white/35">
                                {layer.short}
                              </p>

                              <p className="mt-3 font-mono text-[8px] leading-5 tracking-[0.04em] text-blue-300/65">
                                {layer.spec}
                              </p>

                            </div>
                          </div>

                        </div>
                      </div>
                    </button>
                  );
                })}

              </div>

              {/* ===================================================
                  ACTIVE COMPONENT
              ==================================================== */}

              <div className="mt-auto pt-7">

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">

                  <div className="mb-6 flex items-center justify-between">

                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/20">
                        Selected layer
                      </p>

                      <p className="mt-2 text-sm text-white/75">
                        {selectedLayer.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">

                      <span className="font-mono text-[8px] text-blue-400/70">
                        0{selectedLayer.id} / 06
                      </span>

                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,.8)]" />

                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">

                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
                        Layer
                      </p>

                      <p className="mt-1 font-mono text-xs text-white/55">
                        0{selectedLayer.id}
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
                        Revision
                      </p>

                      <p className="mt-1 font-mono text-xs text-white/55">
                        NMBL-04
                      </p>
                    </div>

                    <div className="col-span-2">

                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/20">
                        Engineering specification
                      </p>

                      <p className="mt-1 font-mono text-[9px] leading-5 text-white/45">
                        {selectedLayer.spec}
                      </p>

                    </div>

                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* =========================================================
            METRICS
        ========================================================== */}

        <Reveal delay={220}>
          <div className="mt-10 grid border-y border-white/[0.08] sm:grid-cols-3">

            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`
                  px-6
                  py-7
                  ${
                    index !== metrics.length - 1
                      ? "border-b border-white/[0.08] sm:border-b-0 sm:border-r"
                      : ""
                  }
                `}
              >

                <p className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-medium tracking-[-0.045em] text-white">
                  {metric.value}
                </p>

                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.22em] text-white/25">
                  {metric.label}
                </p>

              </div>
            ))}

          </div>
        </Reveal>

        {/* =========================================================
            DETAIL GRID
        ========================================================== */}

        <Reveal delay={280}>
          <div className="mt-16">

            <div className="mb-5 flex items-center justify-between">

              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">
                Engineering details
              </span>

              <span className="font-mono text-[8px] tracking-[0.18em] text-white/15">
                NMBL / MACRO STUDY
              </span>

            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 xl:grid-cols-4">

              {details.map((detail) => (
                <div
                  key={detail.number}
                  className="group relative min-h-[240px] overflow-hidden bg-[#080909]"
                >

                  {/* technical visual */}

                  <div className="absolute inset-x-0 top-0 h-[145px]">
                    <DetailVisual type={detail.type} />
                  </div>

                  {/* gradient */}

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080909]" />

                  {/* content */}

                  <div className="absolute inset-x-5 bottom-5">

                    <div className="mb-2 flex items-center justify-between">

                      <span className="font-mono text-[8px] tracking-[0.2em] text-blue-400/70">
                        DETAIL {detail.number}
                      </span>

                      <span className="h-px w-8 bg-white/10 transition-all duration-500 group-hover:w-14 group-hover:bg-blue-400/40" />

                    </div>

                    <h3 className="text-[13px] font-medium text-white/75">
                      {detail.title}
                    </h3>

                    <p className="mt-1 max-w-[260px] text-[10px] leading-4 text-white/30">
                      {detail.description}
                    </p>

                  </div>

                </div>
              ))}

            </div>
          </div>
        </Reveal>

        {/* =========================================================
            FINAL SYSTEM STATEMENT
        ========================================================== */}

        <Reveal delay={340}>
          <div className="mt-16 grid gap-8 border-t border-white/[0.08] pt-8 md:grid-cols-[1fr_auto] md:items-end">

            <div className="max-w-3xl">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-400/[0.04]">

                  <svg
                    viewBox="0 0 40 40"
                    className="h-5 w-5"
                    fill="none"
                  >
                    <path
                      d="M20 5
                      C13 2 7 7 9 14
                      C3 18 6 27 14 27
                      C17 36 27 36 30 28
                      C38 27 39 17 32 13
                      C33 6 25 3 20 5Z"
                      stroke="#4da3ff"
                      strokeWidth="1.5"
                    />

                    <path
                      d="M12 16C17 20 23 20 28 15M13 24C18 20 23 21 29 25"
                      stroke="#4da3ff"
                      strokeWidth="1"
                    />
                  </svg>

                </div>

                <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">
                  System principle
                </span>

              </div>

              <p className="max-w-3xl text-[13px] leading-6 text-white/35">
                NIMBLE is designed around a simple premise: the neural
                interface should become part of the biological environment
                rather than forcing the environment to adapt to the device.
              </p>

            </div>

            <div className="text-left md:text-right">

              <p className="font-mono text-[9px] uppercase tracking-[0.4em] text-white/30">
                Cognivance Labs
              </p>

              <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.25em] text-blue-400/60">
                Advancing Neuronanotechnology
              </p>

            </div>

          </div>
        </Reveal>

      </div>
    </section>
  );
}
