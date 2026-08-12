import { useEffect, useRef, useState } from "react";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAV";

const MRI = "https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg";

const modes: { id: Mode; label: string; description: string }[] = [
  { id: "ANATOMY", label: "Anatomy", description: "T1-weighted structural reference" },
  { id: "CIRCUIT", label: "Circuit reconstruction", description: "Simulated pathway reconstruction" },
  { id: "SIGNAL", label: "Signal propagation", description: "Simulated signal propagation" },
  { id: "NAV", label: "Nanorobot navigation", description: "Simulated NIMBLE navigation" },
];

const brainNodes = [
  [45, 31], [55, 30], [38, 40], [50, 40], [62, 40],
  [33, 51], [45, 49], [56, 49], [68, 51],
  [39, 61], [51, 59], [62, 61], [48, 70],
] as const;

const brainLinks = [
  [0, 1], [0, 2], [0, 3], [1, 3], [1, 4],
  [2, 3], [2, 5], [2, 6], [3, 6], [3, 7], [3, 4],
  [4, 7], [4, 8], [5, 6], [5, 9], [6, 7], [6, 9],
  [6, 10], [7, 8], [7, 10], [7, 11], [8, 11],
  [9, 10], [10, 12], [11, 12],
] as const;

function SignalGraph({ mode }: { mode: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      t += 0.025;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const pulse = mode === "SIGNAL" ? 1 + Math.sin(t * 5) * 0.2 : 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const baseline = h * 0.62;
        const p1 = Math.sin(x * 0.075 + t * 2) * h * 0.035;
        const p2 = Math.sin(x * 0.19 + t * 1.2) * h * 0.012;
        const spike = mode === "SIGNAL" && Math.abs((x % 150) - 75) < 5 ? -h * 0.28 * pulse : 0;
        const y = baseline + p1 + p2 + spike;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const color = mode === "NAV" ? "255,170,76" : mode === "CIRCUIT" ? "171,128,255" : "72,220,255";
      ctx.strokeStyle = `rgba(${color},.85)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${color},.35)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (mode === "SIGNAL") {
        const x = (t * 42) % (w + 40) - 20;
        ctx.fillStyle = "rgba(72,220,255,.65)";
        ctx.fillRect(x, 8, 1, h - 16);
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function CircuitOverlay({ mode }: { mode: Mode }) {
  if (mode === "ANATOMY") return null;
  const color = mode === "NAV" ? "#ffad52" : mode === "CIRCUIT" ? "#b58cff" : "#4de2ff";
  const signal = mode === "SIGNAL";

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="nimble-node-glow"><feGaussianBlur stdDeviation="0.65" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {brainLinks.map(([a, b], i) => {
        const [x1, y1] = brainNodes[a];
        const [x2, y2] = brainNodes[b];
        return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={signal ? ".28" : ".2"} strokeOpacity={mode === "NAV" ? ".32" : ".65"} strokeDasharray={signal ? "1.2 1.4" : undefined} className={signal ? "nimble-signal-line" : undefined} />;
      })}
      {brainNodes.map(([x, y], i) => <g key={i}>
        <circle cx={x} cy={y} r=".72" fill={color} opacity=".9" filter="url(#nimble-node-glow)" />
        <circle cx={x} cy={y} r="2" fill="none" stroke={color} strokeOpacity=".22" />
      </g>)}
      {mode === "SIGNAL" && <circle cx="45" cy="49" r="2" fill="#fff" filter="url(#nimble-node-glow)" className="nimble-signal-source" />}
      {mode === "NAV" && [
        [42, 43], [55, 37], [58, 52], [48, 61], [63, 58],
      ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" fill="#ffd18c" className="nimble-agent" style={{ animationDelay: `${i * 220}ms` }} />)}
    </svg>
  );
}

function BrainViewport({ mode, slice }: { mode: Mode; slice: number }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -4, y: ((e.clientX - r.left) / r.width - 0.5) * 5 });
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ perspective: "1400px" }}
    >
      <div
        className="relative flex h-[min(72vh,650px)] w-[min(72vh,650px)] items-center justify-center"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform .3s ease-out", transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-[4%] rounded-full border border-cyan-300/[.08]" />
        <div className="absolute inset-[10%] rounded-full border border-white/[.035] border-dashed animate-[spin_32s_linear_infinite]" />
        <div className="absolute inset-[18%] rounded-full border border-cyan-200/[.06] border-dotted animate-[spin_22s_linear_infinite_reverse]" />

        <div className="relative z-10 flex h-[68%] w-[68%] items-center justify-center rounded-[48%] border border-cyan-200/[.12] bg-black/25 p-[4%] shadow-[0_0_80px_rgba(25,210,255,.07),inset_0_0_50px_rgba(25,210,255,.035)]">
          <img src={MRI} alt="T1-weighted MRI-derived brain" className="block h-auto w-full max-w-full object-contain grayscale contrast-[1.8] brightness-[1.35] mix-blend-screen" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_35%,rgba(1,5,7,.35)_100%)]" />
          <CircuitOverlay mode={mode} />
          {mode === "SIGNAL" && <div className="pointer-events-none absolute left-[18%] right-[18%] top-1/2 h-px bg-cyan-300/50 shadow-[0_0_12px_rgba(72,220,255,.6)] animate-[nimbleScan_2.2s_linear_infinite]" />}
        </div>

        <div className="absolute left-1/2 top-[5%] -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[.28em] text-cyan-200/50">AXIAL / T1W / Z {slice.toString().padStart(3, "0")}</div>
        <div className="absolute bottom-[6%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[.22em] text-white/25">MRI-DERIVED ANATOMICAL REFERENCE</div>
      </div>
    </div>
  );
}

export function NimbleMRIShowcase() {
  const [mode, setMode] = useState<Mode>("ANATOMY");
  const [slice, setSlice] = useState(128);
  const active = modes.find((m) => m.id === mode)!;

  return (
    <section className="relative overflow-hidden bg-[#020406] text-white">
      <style>{`
        @keyframes nimbleScan { 0% { transform: translateY(-145px); opacity: 0; } 15% { opacity: .9; } 85% { opacity: .9; } 100% { transform: translateY(145px); opacity: 0; } }
        @keyframes nimbleDash { to { stroke-dashoffset: -20; } }
        @keyframes nimblePulse { 50% { opacity: .3; transform: scale(1.8); } }
        .nimble-signal-line { animation: nimbleDash 1.5s linear infinite; }
        .nimble-signal-source { animation: nimblePulse 1.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .nimble-agent { animation: nimblePulse 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(20,190,230,.08),transparent_32%),linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]" />

      <div className="relative mx-auto max-w-[1680px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
        <header className="mb-4 flex items-end justify-between border-b border-white/10 pb-5">
          <div>
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[.42em] text-cyan-300/55">COGNIVANCE LABS / NIMBLE / INSTRUMENT PROGRAMME</div>
            <h2 className="text-3xl font-medium tracking-[-.05em] sm:text-5xl lg:text-[52px]">Neural intelligence mapping</h2>
          </div>
          <div className="hidden text-right font-mono text-[7px] uppercase tracking-[.2em] text-white/30 md:block">
            <div className="text-cyan-200/65">LIVE RESEARCH CONSOLE</div>
            <div className="mt-2">T1W / SIMULATION / ONLINE</div>
          </div>
        </header>

        <div className="grid gap-3 xl:grid-cols-[190px_minmax(0,1fr)_285px]">
          <aside className="order-2 rounded-xl border border-white/10 bg-[#070a0d]/95 p-3 xl:order-1">
            <div className="font-mono text-[7px] uppercase tracking-[.32em] text-white/30">Imaging controls</div>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex justify-between font-mono text-[7px] text-white/35"><span>SUBJECT</span><span className="text-emerald-300">ONLINE</span></div>
              <div className="mt-2 text-[11px] text-white/75">sub-01_T1w</div>
            </div>
            <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[7px] text-white/35">
              <div className="flex justify-between"><span>MODALITY</span><span className="text-white/65">T1-WEIGHTED</span></div>
              <div className="flex justify-between"><span>FIELD</span><span className="text-white/65">3.0 T</span></div>
              <div className="flex justify-between"><span>VOXEL</span><span className="text-white/65">1.0 mm³</span></div>
              <div className="flex justify-between"><span>ORIENT</span><span className="text-white/65">RAS</span></div>
            </div>
            <div className="mt-5 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Slice position</div>
            <input aria-label="MRI slice" type="range" min="1" max="256" value={slice} onChange={(e) => setSlice(Number(e.target.value))} className="mt-4 w-full accent-cyan-300" />
            <div className="mt-2 flex justify-between font-mono text-[7px] text-white/25"><span>001</span><span>Z {slice.toString().padStart(3, "0")}</span><span>256</span></div>
            <div className="mt-5 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Layers</div>
            <div className="mt-3 space-y-2">{["STRUCTURE", "CORTEX", "WHITE MATTER", "VASCULAR MASK"].map((x, i) => <div key={x} className="flex items-center gap-2 text-[8px] text-white/45"><span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-cyan-300" : "bg-white/20"}`} />{x}<span className="ml-auto font-mono text-[7px] text-white/20">{i === 0 ? "ACTIVE" : "READY"}</span></div>)}</div>
          </aside>

          <main className="order-1 relative min-h-[650px] overflow-hidden rounded-xl border border-white/10 bg-[#010304] xl:order-2">
            <div className="absolute left-4 top-4 z-20 flex items-center gap-2 font-mono text-[7px] uppercase tracking-[.25em] text-white/30"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(72,220,255,.8)]" /> MRI VOLUME / ONLINE</div>
            <div className="absolute right-4 top-4 z-20 rounded-full border border-white/10 px-3 py-1 font-mono text-[7px] tracking-[.2em] text-cyan-200/55">{active.label.toUpperCase()}</div>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(80,220,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,220,255,.05) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
            <BrainViewport mode={mode} slice={slice} />
            <div className="absolute bottom-4 left-4 z-20 font-mono text-[7px] tracking-[.18em] text-white/25">X 0.0 / Y 0.0 / Z {slice.toString().padStart(3, "0")} / RAS</div>
            <div className="absolute bottom-4 right-4 z-20 font-mono text-[7px] tracking-[.18em] text-white/25">RENDER: WEB SAFE / DEPTH: SIMULATED</div>
          </main>

          <aside className="order-3 rounded-xl border border-white/10 bg-[#070a0d]/95 p-3">
            <div className="font-mono text-[7px] uppercase tracking-[.32em] text-white/30">Research modes</div>
            <div className="mt-3 space-y-2">
              {modes.map((item, i) => {
                const selected = item.id === mode;
                return <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`group w-full cursor-pointer rounded-none border p-3 text-left transition-all duration-200 ${selected ? "border-cyan-300/55 bg-cyan-300/[.055] shadow-[inset_0_0_24px_rgba(72,220,255,.035)]" : "border-white/10 bg-black/15 hover:border-white/25 hover:bg-white/[.025]"}`}>
                  <div className="flex items-center justify-between font-mono text-[6px] tracking-[.25em] text-white/25"><span>0{i + 1}</span><span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-cyan-300 shadow-[0_0_7px_rgba(72,220,255,.8)]" : "bg-white/15"}`} /></div>
                  <div className={`mt-3 text-[11px] font-medium ${selected ? "text-white" : "text-white/75"}`}>{item.label}</div>
                  <div className="mt-1 text-[8px] leading-4 text-white/30">{item.description}</div>
                </button>;
              })}
            </div>

            <div className="my-5 border-t border-white/10" />
            <div className="font-mono text-[7px] uppercase tracking-[.32em] text-white/30">System readout</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[['MODALITY','T1W'],['SOURCE','MRI'],['RENDER','WEB SAFE'],['STATE','ONLINE']].map(([a,b]) => <div key={a} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="font-mono text-[6px] text-white/25">{a}</div><div className="mt-1 text-[8px] text-white/60">{b}</div></div>)}
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between font-mono text-[6px] tracking-[.2em] text-white/25"><span>NEURAL SIGNAL</span><span className="text-cyan-300/65">LIVE</span></div>
              <div className="relative mt-3 h-20 overflow-hidden rounded border border-white/5"><SignalGraph mode={mode} /></div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
              <div className="rounded border border-white/10 p-2"><div className="text-[6px] text-white/25">SLICE</div><div className="mt-1 text-[9px] text-white/65">{slice}</div></div>
              <div className="rounded border border-white/10 p-2"><div className="text-[6px] text-white/25">MODE</div><div className="mt-1 text-[9px] text-white/65">{mode}</div></div>
              <div className="rounded border border-white/10 p-2"><div className="text-[6px] text-white/25">FPS</div><div className="mt-1 text-[9px] text-white/65">60</div></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
