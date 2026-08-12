import { useEffect, useRef, useState } from "react";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAV";

const MRI = "https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg";

const modes: { id: Mode; label: string; short: string }[] = [
  { id: "ANATOMY", label: "Anatomy", short: "T1W structural reference" },
  { id: "CIRCUIT", label: "Circuit reconstruction", short: "Simulated pathway layer" },
  { id: "SIGNAL", label: "Signal propagation", short: "Simulated signal layer" },
  { id: "NAV", label: "Nanorobot navigation", short: "Simulated NIMBLE layer" },
];

const routes = [
  "M18 43 C30 24 37 64 50 40 S70 25 83 47",
  "M16 55 C29 34 39 62 49 48 S66 35 85 57",
  "M22 30 C34 49 40 23 53 39 S70 54 80 31",
  "M26 67 C35 48 46 69 56 50 S71 42 78 67",
  "M15 48 C29 48 34 31 46 47 S67 68 87 43",
];

function DiagnosticGraph({ mode }: { mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      t += 0.035;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const color = mode === "NAV" ? "255,166,72" : mode === "CIRCUIT" ? "177,126,255" : mode === "SIGNAL" ? "69,245,183" : "72,218,255";

      ctx.strokeStyle = "rgba(255,255,255,.055)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = h * 0.54 + Math.sin(x * 0.11 + t * 4) * h * 0.12 + Math.sin(x * 0.31 + t) * h * 0.045;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${color},.9)`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(${color},.55)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (mode === "SIGNAL") {
        const x = ((t * 48) % (w + 80)) - 40;
        ctx.fillStyle = `rgba(${color},.85)`;
        ctx.fillRect(x, 0, 2, h);
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function NeuralOverlay({ mode }: { mode: Mode }) {
  const color = mode === "NAV" ? "#ffab48" : mode === "CIRCUIT" ? "#b58cff" : mode === "SIGNAL" ? "#45f5b7" : "#48dcff";
  const active = mode !== "ANATOMY";

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="nimble-glow"><feGaussianBlur stdDeviation="0.65" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="nimble-path" x1="0" x2="1"><stop stopColor={color} stopOpacity="0"/><stop offset=".45" stopColor={color} stopOpacity={active ? ".85" : ".22"}/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient>
      </defs>
      {routes.map((d, i) => <path key={i} d={d} fill="none" stroke="url(#nimble-path)" strokeWidth={active ? ".34" : ".16"} strokeDasharray={mode === "SIGNAL" ? "1 2" : undefined} className={mode === "SIGNAL" ? "nimble-route-flow" : ""} />)}
      {Array.from({ length: 15 }).map((_, i) => {
        const x = 20 + ((i * 17) % 61);
        const y = 28 + ((i * 23) % 44);
        return <g key={i} className={active ? "nimble-node" : ""} style={{ animationDelay: `${i * 90}ms` }}>
          <circle cx={x} cy={y} r={active ? "0.65" : "0.35"} fill={color} opacity={active ? ".9" : ".2"} filter="url(#nimble-glow)" />
          <circle cx={x} cy={y} r="2.1" fill="none" stroke={color} strokeOpacity={active ? ".25" : ".07"} />
        </g>;
      })}
      {mode === "NAV" && <><circle cx="50" cy="47" r="1.5" fill="#ffd08a" filter="url(#nimble-glow)"/><circle cx="50" cy="47" r="5" fill="none" stroke="#ffab48" strokeOpacity=".32" className="nimble-orbit"/></>}
    </svg>
  );
}

function BrainStage({ mode, slice }: { mode: Mode; slice: number }) {
  const [hover, setHover] = useState({ x: 0, y: 0 });
  const active = mode !== "ANATOMY";

  return (
    <div
      className="absolute inset-[10%_18%_12%_18%] flex items-center justify-center"
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover({ x: ((e.clientX - r.left) / r.width - .5) * 7, y: -((e.clientY - r.top) / r.height - .5) * 6 }); }}
      onMouseLeave={() => setHover({ x: 0, y: 0 })}
      style={{ perspective: "1200px" }}
    >
      <div className="relative h-[88%] w-[88%]" style={{ transform: `rotateX(${hover.y}deg) rotateY(${hover.x}deg)`, transformStyle: "preserve-3d", transition: "transform .25s ease-out" }}>
        <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/[.08] blur-[65px]" />
        <div className="absolute inset-0 rounded-[50%] border border-cyan-300/10 shadow-[inset_0_0_80px_rgba(20,210,255,.04),0_0_70px_rgba(20,180,255,.04)]" />
        <div className="absolute inset-[8%] rounded-[50%] border border-white/[.035] border-dashed animate-[spin_24s_linear_infinite]" />
        <div className="absolute inset-[15%] rounded-[50%] border border-cyan-200/[.08] border-dotted animate-[spin_16s_linear_infinite_reverse]" />

        {[0, 1, 2].map((i) => <img key={i} src={MRI} alt="" aria-hidden="true" className="absolute left-1/2 top-1/2 h-auto w-[78%] -translate-x-1/2 -translate-y-1/2 object-contain grayscale contrast-[1.8] brightness-[1.35] mix-blend-screen" style={{ opacity: .12 + i * .05, transform: `translate(-50%,-50%) translateZ(${i * 12}px) scale(${1 + i * .012})` }} />)}
        <img src={MRI} alt="T1-weighted MRI-derived brain" className="absolute left-1/2 top-1/2 h-auto w-[78%] -translate-x-1/2 -translate-y-1/2 object-contain grayscale contrast-[2] brightness-[1.28] mix-blend-screen" style={{ opacity: .94, transform: `translate(-50%,-50%) translateZ(40px)` }} />

        <div className="absolute left-1/2 top-1/2 h-[64%] w-[64%] -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%,-50%) translateZ(52px)` }}>
          <NeuralOverlay mode={mode} />
        </div>

        <div className="absolute left-1/2 top-[6%] -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[.28em] text-cyan-200/55">T1W · AXIAL · Z {slice.toString().padStart(3, "0")}</div>
        <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[.22em] text-white/25">MRI-DERIVED ANATOMICAL REFERENCE</div>
      </div>
    </div>
  );
}

export function NimbleMRIShowcase() {
  const [mode, setMode] = useState<Mode>("ANATOMY");
  const [slice, setSlice] = useState(128);
  const active = modes.find((m) => m.id === mode)!;

  return (
    <section className="relative overflow-hidden bg-[#030507] text-white">
      <style>{`
        @keyframes nimbleFlow { to { stroke-dashoffset: -30; } }
        @keyframes nimblePulse { 50% { transform: scale(1.8); opacity: .28; } }
        @keyframes nimbleOrbit { to { transform: rotate(360deg); transform-origin: 50% 47%; } }
        .nimble-route-flow { animation: nimbleFlow 1.5s linear infinite; }
        .nimble-node { transform-box: fill-box; transform-origin: center; animation: nimblePulse 1.8s ease-in-out infinite; }
        .nimble-orbit { transform-box: fill-box; transform-origin: center; animation: nimbleOrbit 4s linear infinite; }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(35,190,235,.12),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(105,70,255,.08),transparent_30%)]" />

      <div className="relative mx-auto max-w-[1680px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
        <div className="mb-5 flex items-end justify-between gap-6 border-b border-white/10 pb-5">
          <div>
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[.42em] text-cyan-300/60">COGNIVANCE LABS · NIMBLE · INSTRUMENT PROGRAMME</div>
            <h2 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl lg:text-[54px] lg:leading-none">Neural intelligence mapping</h2>
          </div>
          <div className="hidden text-right font-mono text-[7px] uppercase tracking-[.2em] text-white/30 md:block"><div className="text-cyan-200/65">LIVE RESEARCH CONSOLE</div><div className="mt-2">T1W / SIMULATION / ONLINE</div></div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[205px_minmax(0,1fr)_275px]">
          <aside className="order-2 rounded-xl border border-white/10 bg-[#070a0d]/90 p-3 xl:order-1">
            <div className="font-mono text-[7px] uppercase tracking-[.32em] text-white/30">Imaging controls</div>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3"><div className="flex justify-between font-mono text-[7px] text-white/35"><span>SUBJECT</span><span className="text-emerald-300">ONLINE</span></div><div className="mt-2 text-[11px] text-white/70">sub-01_T1w</div></div>
            <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[7px] text-white/35"><div className="flex justify-between"><span>MODALITY</span><span className="text-white/65">T1-WEIGHTED</span></div><div className="flex justify-between"><span>FIELD</span><span className="text-white/65">3.0 T</span></div><div className="flex justify-between"><span>VOXEL</span><span className="text-white/65">1.0 mm³</span></div><div className="flex justify-between"><span>ORIENT</span><span className="text-white/65">RAS</span></div></div>
            <div className="mt-4 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Slice position</div>
            <input aria-label="MRI slice" type="range" min="1" max="256" value={slice} onChange={(e) => setSlice(Number(e.target.value))} className="mt-4 w-full accent-cyan-300" />
            <div className="mt-2 flex justify-between font-mono text-[7px] text-white/25"><span>001</span><span>Z {slice}</span><span>256</span></div>
            <div className="mt-5 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Analysis layers</div>
            <div className="mt-3 space-y-2">{["STRUCTURE", "CORTEX", "WHITE MATTER", "VASCULAR MASK"].map((x, i) => <div key={x} className="flex items-center gap-2 text-[8px] text-white/45"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300/60" />{x}<span className="ml-auto font-mono text-[7px] text-white/20">{i ? "READY" : "ACTIVE"}</span></div>)}</div>
          </aside>

          <main className="order-1 relative min-h-[690px] overflow-hidden rounded-xl border border-white/10 bg-[#010304] xl:order-2">
            <div className="absolute inset-0 opacity-[.22]" style={{ backgroundImage: "linear-gradient(rgba(70,220,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(70,220,255,.06) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="absolute inset-[7%] rounded-[22px] border border-white/[.055]" />
            <div className="absolute left-4 top-4 z-30 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[.24em] text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#57eaff]" /> MRI VOLUME / ONLINE</div>
            <div className="absolute right-4 top-4 z-30 rounded-full border border-cyan-200/20 bg-black/60 px-3 py-1 font-mono text-[7px] uppercase tracking-[.2em] text-cyan-200/70">{active.label}</div>

            <div className="absolute inset-[5%] grid grid-cols-[145px_minmax(0,1fr)_175px] gap-3">
              <div className="hidden flex-col gap-2 md:flex">
                <div className="rounded-lg border border-cyan-200/15 bg-[#061016]/75 p-3"><div className="font-mono text-[6px] uppercase tracking-[.2em] text-cyan-200/55">Cortical map</div><div className="mt-3 h-20 rounded bg-black/40"><svg viewBox="0 0 120 80" className="h-full w-full"><path d="M8 48 C20 18 36 65 49 34 S76 21 88 44 S105 54 113 25" fill="none" stroke="#54eaff" strokeWidth="1" opacity=".8"/><path d="M9 57 C24 34 37 72 54 45 S78 38 111 53" fill="none" stroke="#9b7cff" strokeWidth=".7" opacity=".55"/></svg></div><div className="mt-2 font-mono text-[6px] text-white/25">REGION ACTIVITY · LIVE</div></div>
                <div className="rounded-lg border border-white/10 bg-black/35 p-3"><div className="font-mono text-[6px] uppercase tracking-[.2em] text-white/30">Coordinates</div><div className="mt-3 space-y-2 font-mono text-[7px] text-white/45"><div className="flex justify-between"><span>X</span><span>+031.4</span></div><div className="flex justify-between"><span>Y</span><span>-018.2</span></div><div className="flex justify-between"><span>Z</span><span>{slice}.0</span></div></div></div>
              </div>

              <div className="relative min-w-0">
                <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/[.06]" />
                <BrainStage mode={mode} slice={slice} />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[6px] uppercase tracking-[.22em] text-white/20">CENTERED · AXIAL REFERENCE · DEPTH LAYERS ACTIVE</div>
              </div>

              <div className="hidden flex-col gap-2 md:flex">
                <div className="rounded-lg border border-white/10 bg-black/35 p-2"><div className="mb-2 font-mono text-[6px] uppercase tracking-[.2em] text-white/30">Neural signal</div><div className="h-20 overflow-hidden rounded bg-black/30"><DiagnosticGraph mode={mode} /></div></div>
                <div className="rounded-lg border border-white/10 bg-black/35 p-2"><div className="font-mono text-[6px] uppercase tracking-[.2em] text-white/30">System state</div><div className="mt-3 space-y-2 font-mono text-[7px] text-white/45"><div className="flex justify-between"><span>STREAM</span><span className="text-emerald-300">STABLE</span></div><div className="flex justify-between"><span>FPS</span><span>60</span></div><div className="flex justify-between"><span>LATENCY</span><span>12ms</span></div><div className="flex justify-between"><span>LAYER</span><span className="text-cyan-200">{mode}</span></div></div></div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-30 grid grid-cols-4 gap-2 font-mono text-[7px]">
              {["TISSUE CONTRAST", "VOXEL COUNT", "SCAN PROGRESS", "RECONSTRUCTION"].map((label, i) => <div key={label} className="rounded border border-white/10 bg-black/50 px-3 py-2"><div className="text-white/25">{label}</div><div className="mt-1 text-white/65">{i === 0 ? "0.84" : i === 1 ? "16.7M" : i === 2 ? "100%" : mode === "ANATOMY" ? "REFERENCE" : "ACTIVE"}</div></div>)}
            </div>
          </main>

          <aside className="order-3 rounded-xl border border-white/10 bg-[#070a0d]/90 p-3">
            <div className="font-mono text-[7px] uppercase tracking-[.32em] text-white/30">Research modes</div>
            <div className="mt-3 space-y-2">{modes.map((item, i) => <button key={item.id} onClick={() => setMode(item.id)} className={`w-full rounded-lg border p-3 text-left transition-all ${mode === item.id ? "border-cyan-200/40 bg-cyan-200/[.06] shadow-[0_0_25px_rgba(60,220,255,.07)]" : "border-white/10 bg-black/20 hover:border-white/20"}`}><div className="flex justify-between font-mono text-[6px] text-white/25"><span>0{i + 1}</span><span className={`h-1.5 w-1.5 rounded-full ${mode === item.id ? "bg-cyan-300 shadow-[0_0_9px_#58eaff]" : "bg-white/15"}`} /></div><div className="mt-2 text-[10px] font-medium text-white/85">{item.label}</div><div className="mt-1 text-[7px] leading-3 text-white/30">{item.short}</div></button>)}</div>
            <div className="mt-4 border-t border-white/10 pt-4 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Live telemetry</div>
            <div className="mt-3 space-y-3">{[["NEURAL ACTIVITY", "72.4%"], ["PATHWAY DENSITY", "0.81"], ["SIGNAL COHERENCE", "94.7%"], ["MODEL CONFIDENCE", "98.2%"]].map(([a,b]) => <div key={a}><div className="flex justify-between font-mono text-[7px] text-white/40"><span>{a}</span><span className="text-cyan-200/65">{b}</span></div><div className="mt-1 h-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-300/55" style={{ width: b }} /></div></div>)}</div>
            <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3"><div className="font-mono text-[6px] uppercase tracking-[.2em] text-white/25">Layer status</div><div className="mt-3 grid grid-cols-2 gap-2">{["ANATOMY", "CIRCUIT", "SIGNAL", "NAV"].map((x) => <div key={x} className={`rounded border px-2 py-2 font-mono text-[6px] ${mode === x ? "border-cyan-200/30 text-cyan-200/75" : "border-white/5 text-white/25"}`}>{x}<br/><span className="text-[5px]">{mode === x ? "ACTIVE" : "READY"}</span></div>)}</div></div>
          </aside>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr]">
          <div className="rounded-xl border border-white/10 bg-[#070a0d]/90 p-3"><div className="font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Multiplanar reference</div><div className="mt-3 grid grid-cols-3 gap-2">{["AXIAL", "CORONAL", "SAGITTAL"].map((x) => <div key={x} className="relative overflow-hidden rounded border border-white/10 bg-black/40"><img src={MRI} alt={x} className="h-20 w-full object-contain grayscale contrast-[1.7] brightness-[1.2] mix-blend-screen"/><span className="absolute bottom-1 left-1 font-mono text-[6px] text-white/40">{x}</span></div>)}</div></div>
          <div className="rounded-xl border border-white/10 bg-[#070a0d]/90 p-3"><div className="font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Intensity distribution</div><div className="mt-3 h-[84px]"><DiagnosticGraph mode={mode} /></div></div>
          <div className="rounded-xl border border-white/10 bg-[#070a0d]/90 p-3"><div className="font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Reconstruction pipeline</div><div className="mt-4 flex items-center justify-between font-mono text-[6px] text-white/35"><span className="rounded border border-cyan-200/20 px-2 py-2 text-cyan-200/60">MRI</span><span>→</span><span className="rounded border border-white/10 px-2 py-2">SEGMENT</span><span>→</span><span className="rounded border border-violet-200/20 px-2 py-2 text-violet-200/60">MAP</span><span>→</span><span className="rounded border border-white/10 px-2 py-2">SIM</span></div><div className="mt-4 h-1 rounded-full bg-white/5"><div className="h-full w-[86%] rounded-full bg-gradient-to-r from-cyan-300/50 via-violet-300/60 to-cyan-300/50" /></div></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-[7px] uppercase tracking-[.24em] text-white/20"><span>COGNIVANCE LABS</span><span>NIMBLE · RESEARCH CONSOLE</span><span>MRI-DERIVED / SIMULATION LAYERS</span></div>
      </div>
    </section>
  );
}
