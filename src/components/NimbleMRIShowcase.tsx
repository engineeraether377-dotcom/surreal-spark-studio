import { useEffect, useMemo, useState } from "react";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAV";

const MRI = "https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg";

const modes: { id: Mode; label: string; description: string }[] = [
  { id: "ANATOMY", label: "Anatomy", description: "T1-weighted structural reference" },
  { id: "CIRCUIT", label: "Circuit reconstruction", description: "Simulated pathway reconstruction" },
  { id: "SIGNAL", label: "Signal propagation", description: "Simulated propagation layer" },
  { id: "NAV", label: "Nanorobot navigation", description: "Simulated NIMBLE navigation" },
];

const nodes = [
  [38, 36], [49, 30], [60, 36], [31, 47], [43, 45], [55, 45], [68, 48],
  [36, 58], [48, 55], [60, 57], [45, 68], [56, 67],
] as const;

const links = [
  [0, 1], [1, 2], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [3, 4],
  [3, 7], [4, 5], [4, 8], [5, 6], [5, 8], [5, 9], [7, 8], [7, 10],
  [8, 9], [8, 10], [8, 11], [9, 11], [10, 11],
] as const;

function CircuitLayer({ mode }: { mode: Mode }) {
  if (mode === "ANATOMY") return null;
  const stroke = mode === "CIRCUIT" ? "#b995ff" : mode === "SIGNAL" ? "#52ddff" : "#ffb45f";
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <filter id="nimbleGlow"><feGaussianBlur stdDeviation="0.45" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {links.map(([a, b], i) => {
        const [x1, y1] = nodes[a]; const [x2, y2] = nodes[b];
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="0.32" strokeOpacity={mode === "NAV" ? ".34" : ".72"} strokeDasharray={mode === "SIGNAL" ? "1.8 1.2" : undefined} className={mode === "SIGNAL" ? "nimble-link-flow" : ""} />;
      })}
      {nodes.map(([x, y], i) => (
        <g key={i} filter="url(#nimbleGlow)">
          <circle cx={x} cy={y} r="0.8" fill={stroke} />
          <circle cx={x} cy={y} r="2.4" fill="none" stroke={stroke} strokeOpacity=".18" strokeWidth=".22" />
        </g>
      ))}
      {mode === "SIGNAL" && <circle cx="48" cy="55" r="1.4" fill="#fff" className="nimble-source" />}
      {mode === "NAV" && [[41,42],[58,38],[61,54],[48,61],[56,64]].map(([x,y],i) => (
        <g key={i} className="nimble-robot" style={{ animationDelay: `${i * 320}ms` }}>
          <circle cx={x} cy={y} r="1" fill="#ffd08c" />
          <circle cx={x} cy={y} r="2.4" fill="none" stroke="#ffb45f" strokeOpacity=".3" strokeWidth=".25" />
        </g>
      ))}
    </svg>
  );
}

function VolumetricBrain({ mode, rotation }: { mode: Mode; rotation: { x: number; y: number } }) {
  const depthPlanes = useMemo(() => Array.from({ length: 15 }, (_, i) => i - 7), []);
  const modeGlow = mode === "CIRCUIT" ? "rgba(181,149,255,.16)" : mode === "SIGNAL" ? "rgba(82,221,255,.18)" : mode === "NAV" ? "rgba(255,180,95,.13)" : "rgba(82,221,255,.10)";

  return (
    <div className="relative h-[min(72vw,650px)] w-[min(72vw,650px)] max-h-[650px] max-w-[650px]" style={{ perspective: "1500px" }}>
      <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`, transformStyle: "preserve-3d", transition: "transform 260ms ease-out" }}>
        <div className="absolute inset-[7%] rounded-[46%] border border-cyan-200/10 shadow-[0_0_90px_rgba(38,211,244,.07)]" style={{ transform: "translateZ(-70px) rotateZ(-4deg)" }} />
        <div className="absolute inset-[12%] rounded-[46%] border border-white/5 border-dashed animate-[spin_38s_linear_infinite]" style={{ transform: "translateZ(-30px) rotateZ(12deg)" }} />
        {depthPlanes.map((z) => {
          const center = Math.abs(z);
          return (
            <div key={z} className="absolute inset-[15%] flex items-center justify-center" style={{ transform: `translateZ(${z * 10}px) scale(${1 - center * .006})`, opacity: .055 + (7 - center) * .012 }}>
              <img src={MRI} alt="" aria-hidden="true" className="h-auto w-full object-contain grayscale contrast-[1.75] brightness-[1.55] mix-blend-screen" style={{ filter: `drop-shadow(0 0 ${10 + (7 - center) * 2}px ${modeGlow})` }} />
            </div>
          );
        })}
        <div className="absolute inset-[15%] flex items-center justify-center" style={{ transform: "translateZ(75px)" }}>
          <img src={MRI} alt="T1-weighted MRI-derived brain volume" className="h-auto w-full object-contain grayscale contrast-[2] brightness-[1.5] mix-blend-screen drop-shadow-[0_0_35px_rgba(83,224,255,.15)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,.5)_88%)]" />
          <CircuitLayer mode={mode} />
          {mode === "SIGNAL" && <div className="absolute left-[24%] right-[24%] top-[22%] h-px bg-cyan-200/75 shadow-[0_0_14px_rgba(82,221,255,.9)] animate-[nimbleSweep_2.8s_linear_infinite]" />}
        </div>
        <div className="absolute inset-[20%] rounded-[48%] border border-cyan-100/[.08]" style={{ transform: "translateZ(88px) rotateZ(8deg)" }} />
        <div className="absolute left-1/2 top-[3%] -translate-x-1/2 font-mono text-[7px] tracking-[.32em] text-cyan-200/45" style={{ transform: "translateZ(100px)" }}>3D VOLUME / T1W</div>
        <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] tracking-[.24em] text-white/30" style={{ transform: "translateZ(100px)" }}>MRI-DERIVED • VISUAL RECONSTRUCTION</div>
      </div>
    </div>
  );
}

function SignalGraph({ mode }: { mode: Mode }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
      <svg viewBox="0 0 300 90" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0 52 L18 52 L24 50 L30 54 L37 51 L43 52 L49 50 L56 53 L63 51 L70 52 L78 49 L84 53 L91 51 L98 52 L104 50 L111 53 L118 51 L125 52 L132 49 L139 53 L146 51 L153 52 L160 50 L167 53 L174 51 L181 52 L188 49 L195 53 L202 51 L209 52 L216 50 L223 53 L230 51 L237 52 L244 49 L251 53 L258 51 L265 52 L272 50 L280 53 L288 51 L300 52" fill="none" stroke={mode === "SIGNAL" ? "#52ddff" : "rgba(255,255,255,.45)"} strokeWidth="1.2" />
        {mode === "SIGNAL" && <path d="M0 52 L55 52 L61 18 L66 69 L72 44 L77 52 L142 52 L148 14 L153 70 L159 44 L164 52 L225 52 L231 20 L236 68 L242 44 L247 52 L300 52" fill="none" stroke="#52ddff" strokeWidth="1.3" className="nimble-graph-pulse" />}
      </svg>
      <div className="absolute left-2 top-2 font-mono text-[6px] tracking-[.22em] text-white/30">NEURAL SIGNAL / LIVE</div>
      <div className="absolute bottom-2 right-2 font-mono text-[6px] text-cyan-200/45">{mode === "SIGNAL" ? "ACTIVE" : "STANDBY"}</div>
    </div>
  );
}

export function NimbleMRIShowcase() {
  const [mode, setMode] = useState<Mode>("ANATOMY");
  const [slice, setSlice] = useState(128);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  return (
    <section className="relative overflow-hidden bg-[#020406] text-white">
      <style>{`
        @keyframes nimbleSweep { 0% { transform: translateY(-90px); opacity: 0; } 12% { opacity: .9; } 88% { opacity: .9; } 100% { transform: translateY(90px); opacity: 0; } }
        @keyframes nimbleFlow { to { stroke-dashoffset: -18; } }
        @keyframes nimbleSource { 50% { transform: scale(2.1); opacity: .35; } }
        @keyframes nimbleRobot { 0%,100% { transform: translate(0,0); opacity: .45; } 50% { transform: translate(5px,-4px); opacity: 1; } }
        @keyframes nimbleGraph { to { transform: translateX(-35px); } }
        .nimble-link-flow { animation: nimbleFlow 1.5s linear infinite; }
        .nimble-source { animation: nimbleSource 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .nimble-robot { animation: nimbleRobot 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .nimble-graph-pulse { animation: nimbleGraph 1.8s linear infinite; }
      `}</style>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(29,190,230,.09),transparent_30%),linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[length:auto,26px_26px,26px_26px]" />
      <div className="relative mx-auto max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-4 flex items-end justify-between border-b border-white/10 pb-5">
          <div><div className="font-mono text-[8px] tracking-[.42em] text-cyan-300/55">COGNIVANCE LABS / NIMBLE / INSTRUMENT PROGRAMME</div><h2 className="mt-3 text-3xl font-medium tracking-[-.05em] sm:text-5xl">Neural intelligence mapping</h2></div>
          <div className="hidden text-right font-mono text-[7px] tracking-[.2em] text-white/30 md:block"><div className="text-cyan-200/65">LIVE RESEARCH CONSOLE</div><div className="mt-2">T1W / 3D RECONSTRUCTION / ONLINE</div></div>
        </header>

        <div className="grid gap-3 xl:grid-cols-[185px_minmax(0,1fr)_285px]">
          <aside className="order-2 rounded-xl border border-white/10 bg-[#070a0d]/95 p-3 xl:order-1">
            <div className="font-mono text-[7px] uppercase tracking-[.3em] text-white/30">Imaging controls</div>
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3"><div className="flex justify-between font-mono text-[7px] text-white/35"><span>SUBJECT</span><span className="text-emerald-300">ONLINE</span></div><div className="mt-2 text-[11px] text-white/75">sub-01_T1w</div></div>
            <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3 font-mono text-[7px] text-white/35"><div className="flex justify-between"><span>MODALITY</span><span className="text-white/65">T1-WEIGHTED</span></div><div className="flex justify-between"><span>FIELD</span><span className="text-white/65">3.0 T</span></div><div className="flex justify-between"><span>VOXEL</span><span className="text-white/65">1.0 mm³</span></div><div className="flex justify-between"><span>ORIENT</span><span className="text-white/65">RAS</span></div></div>
            <div className="mt-5 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Volume position</div><input aria-label="MRI slice" type="range" min="1" max="256" value={slice} onChange={(e) => setSlice(Number(e.target.value))} className="mt-4 w-full accent-cyan-300" /><div className="mt-2 flex justify-between font-mono text-[7px] text-white/25"><span>001</span><span>Z {slice.toString().padStart(3,"0")}</span><span>256</span></div>
            <div className="mt-5 font-mono text-[7px] uppercase tracking-[.28em] text-white/30">Render layers</div><div className="mt-3 space-y-2">{["STRUCTURE","CORTEX","WHITE MATTER","CIRCUIT MASK"].map((x,i)=><div key={x} className="flex items-center gap-2 text-[8px] text-white/45"><span className={`h-1.5 w-1.5 rounded-full ${i===0?"bg-cyan-300":"bg-white/20"}`} />{x}<span className="ml-auto font-mono text-[6px]">{i===3 && mode!=="ANATOMY" ? "ON":"OFF"}</span></div>)}</div>
          </aside>

          <main className="order-1 min-h-[680px] rounded-xl border border-white/10 bg-[#030609] p-3 xl:order-2">
            <div className="relative flex min-h-[650px] items-center justify-center overflow-hidden rounded-lg border border-white/[.07] bg-[#010304]" onMouseMove={(e)=>{const r=e.currentTarget.getBoundingClientRect();setRotation({x:((e.clientY-r.top)/r.height-.5)*-7,y:((e.clientX-r.left)/r.width-.5)*9});}} onMouseLeave={()=>setRotation({x:0,y:0})}>
              <div className="absolute left-4 top-4 z-20 font-mono text-[7px] tracking-[.25em] text-white/30">MRI VOLUME / ONLINE</div>
              <div className="absolute right-4 top-4 z-20 rounded-full border border-cyan-300/20 px-3 py-1 font-mono text-[6px] tracking-[.22em] text-cyan-200/60">{mode}</div>
              <VolumetricBrain mode={mode} rotation={rotation} />
              <div className="absolute bottom-4 left-4 z-20 font-mono text-[6px] text-white/25">X 128 / Y 128 / Z {slice.toString().padStart(3,"0")}</div>
              <div className="absolute bottom-4 right-4 z-20 font-mono text-[6px] text-white/25">3D VOLUME • SIMULATION</div>
            </div>
          </main>

          <aside className="order-3 rounded-xl border border-white/10 bg-[#070a0d]/95 p-3">
            <div className="font-mono text-[7px] uppercase tracking-[.3em] text-white/30">Research modes</div>
            <div className="mt-3 space-y-2">{modes.map((m,i)=><button key={m.id} type="button" onClick={()=>setMode(m.id)} className={`w-full rounded-lg border p-3 text-left transition-all ${mode===m.id?"border-cyan-300/50 bg-cyan-300/[.07] shadow-[inset_0_0_25px_rgba(82,221,255,.04)]":"border-white/10 bg-black/15 hover:border-white/20"}`}><div className="flex items-center justify-between"><span className="font-mono text-[6px] text-white/25">0{i+1}</span><span className={`h-1.5 w-1.5 rounded-full ${mode===m.id?"bg-cyan-300 shadow-[0_0_8px_rgba(82,221,255,.9)]":"bg-white/15"}`} /></div><div className="mt-2 text-[10px] font-medium text-white/85">{m.label}</div><div className="mt-1 text-[8px] leading-relaxed text-white/35">{m.description}</div></button>)}</div>
            <div className="my-4 border-t border-white/10" />
            <div className="font-mono text-[7px] uppercase tracking-[.3em] text-white/30">System readout</div>
            <div className="mt-3 grid grid-cols-2 gap-2">{[["MODALITY","T1W"],["SOURCE","MRI"],["RENDER","VOLUME"],["STATE","ONLINE"],["DEPTH","15 PLANES"],["MODE",mode]].map(([k,v])=><div key={k} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="font-mono text-[5px] text-white/25">{k}</div><div className="mt-1 text-[8px] text-white/65">{v}</div></div>)}</div>
            <div className="my-4 border-t border-white/10" />
            <div className="mb-2 flex items-center justify-between"><div className="font-mono text-[7px] uppercase tracking-[.3em] text-white/30">Signal monitor</div><span className="font-mono text-[6px] text-cyan-200/50">{mode === "SIGNAL" ? "ACTIVE" : "BASELINE"}</span></div>
            <SignalGraph mode={mode} />
          </aside>
        </div>
      </div>
    </section>
  );
}
