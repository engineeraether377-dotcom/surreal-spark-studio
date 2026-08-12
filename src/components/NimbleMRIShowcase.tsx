import { useState } from "react";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAV";
const MRI = "https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg";
const modes: { id: Mode; label: string; description: string }[] = [
  { id: "ANATOMY", label: "Anatomy", description: "T1-weighted MRI anatomical reference" },
  { id: "CIRCUIT", label: "Circuit reconstruction", description: "Simulated pathway reconstruction layer" },
  { id: "SIGNAL", label: "Signal propagation", description: "Simulated propagation layer" },
  { id: "NAV", label: "Nanorobot navigation", description: "Simulated NIMBLE navigation concept" },
];
function NeuralOverlay({ mode }: { mode: Mode }) {
  if (mode === "ANATOMY") return null;
  const signal = mode === "SIGNAL";
  return <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs><filter id="nimble-glow"><feGaussianBlur stdDeviation="0.7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    {Array.from({ length: 13 }, (_, i) => { const y = 20 + i * 4.7; return <path key={i} d={`M18 ${y} C30 ${y-14},38 ${y+12},49 ${y} S69 ${y-12},82 ${y+2}`} fill="none" stroke={signal ? "#63e6ff" : "#b49cff"} strokeOpacity={signal ? ".58" : ".42"} strokeWidth=".38" strokeDasharray={signal ? "2 2.5" : undefined} filter="url(#nimble-glow)" className={signal ? "nimble-signal-path" : ""}/>; })}
    {mode === "CIRCUIT" && [[42,43],[51,38],[59,49],[47,58],[64,61],[35,52]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="1.15" fill="#d9ccff" filter="url(#nimble-glow)" className="nimble-node" style={{animationDelay:`${i*130}ms`}}/>) }
    {mode === "NAV" && Array.from({length:9},(_,i)=><circle key={i} cx={28+((i*17)%45)} cy={36+((i*13)%28)} r=".9" fill="#7df3ff" filter="url(#nimble-glow)" className="nimble-node" style={{animationDelay:`${i*170}ms`}}/>)}
  </svg>;
}
export function NimbleMRIShowcase() {
  const [mode,setMode]=useState<Mode>("ANATOMY");
  return <section className="relative overflow-hidden bg-[#050607] text-white">
    <style>{`@keyframes signalFlow{to{stroke-dashoffset:-36}}@keyframes nodePulse{50%{transform:scale(1.8);opacity:.35}}.nimble-signal-path{animation:signalFlow 2.2s linear infinite}.nimble-node{transform-box:fill-box;transform-origin:center;animation:nodePulse 1.8s ease-in-out infinite}`}</style>
    <div className="mx-auto max-w-[1540px] px-5 py-14 sm:px-8 lg:px-12 lg:py-24">
      <div className="mb-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end"><div><div className="mb-4 font-mono text-[9px] uppercase tracking-[.36em] text-cyan-300/65">Cognivance Labs / Instrument Programme</div><h1 className="max-w-5xl text-4xl font-medium tracking-[-.05em] sm:text-5xl lg:text-[68px] lg:leading-[.98]">NIMBLE — an anatomical interface for interrogating neural structure.</h1></div><p className="max-w-md text-sm leading-7 text-white/45">MRI-derived anatomical reference with clearly separated computational presentation layers for circuit reconstruction, signal propagation and navigation.</p></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative min-h-[640px] overflow-hidden rounded-[26px] border border-white/10 bg-[#020405]">
          <div className="absolute inset-0 opacity-[.28]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)",backgroundSize:"30px 30px"}}/>
          <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-200/[.05]"/><div className="absolute inset-y-0 left-1/2 w-px bg-cyan-200/[.05]"/>
          <div className="absolute left-5 top-5 z-20 font-mono text-[8px] uppercase tracking-[.24em] text-white/35">● MRI / T1W / REFERENCE</div><div className="absolute right-5 top-5 z-20 rounded-full border border-cyan-200/15 bg-black/60 px-3 py-1 font-mono text-[8px] uppercase tracking-[.2em] text-cyan-200/65">{mode}</div>
          <div className="absolute inset-0 flex items-center justify-center px-8 py-16"><div className="relative aspect-[1.03/1] w-full max-w-[700px] overflow-hidden rounded-[18px] border border-white/10 bg-[#090c0e] shadow-[0_0_120px_rgba(30,210,235,.07)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(55,220,240,.06),transparent_55%)]"/>
            <img src={MRI} alt="T1-weighted MRI of a healthy human brain" className="absolute inset-[5%] h-[90%] w-[90%] object-contain grayscale contrast-[1.35] brightness-[1.1] opacity-[.92] mix-blend-screen"/>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(2,4,5,.86)_86%)]"/><div className="absolute inset-0 ring-1 ring-inset ring-cyan-200/[.05]"/><NeuralOverlay mode={mode}/>
            <div className="absolute left-3 top-3 bottom-3 flex flex-col justify-between font-mono text-[7px] text-white/25"><span>R</span><span>L</span></div><div className="absolute right-3 top-3 bottom-3 flex flex-col justify-between font-mono text-[7px] text-white/25"><span>SUPERIOR</span><span>INFERIOR</span></div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-black/55 px-3 py-1 font-mono text-[7px] uppercase tracking-[.18em] text-white/35">MRI-DERIVED ANATOMY</div>
          </div></div>
          <div className="absolute bottom-5 left-5 right-5 z-20 flex items-end justify-between font-mono text-[7px] uppercase tracking-[.18em] text-white/25"><span>7T T1-weighted reference</span><span>{mode === "ANATOMY" ? "BASE ANATOMY" : "SIMULATION LAYER ACTIVE"}</span></div>
        </div>
        <aside className="rounded-[26px] border border-white/10 bg-white/[.025] p-4 sm:p-5"><div className="mb-4 font-mono text-[8px] uppercase tracking-[.3em] text-white/30">Research modes</div><div className="space-y-2">{modes.map((item,i)=><button key={item.id} onClick={()=>setMode(item.id)} className={`w-full border p-4 text-left transition-all ${mode===item.id?"border-cyan-200/35 bg-cyan-200/[.055] shadow-[inset_2px_0_0_rgba(125,243,255,.8)]":"border-white/10 bg-black/10 hover:border-white/20"}`}><div className="flex items-center justify-between"><span className="font-mono text-[8px] text-white/25">0{i+1}</span><span className={`h-1.5 w-1.5 rounded-full ${mode===item.id?"bg-cyan-200 shadow-[0_0_12px_#7df3ff]":"bg-white/15"}`}/></div><div className="mt-3 text-[13px] font-medium">{item.label}</div><div className="mt-1 text-[10px] leading-5 text-white/35">{item.description}</div></button>)}</div>
          <div className="mt-6 border-t border-white/10 pt-5 font-mono text-[8px] uppercase tracking-[.22em] text-white/30">System readout</div><div className="mt-3 grid grid-cols-2 gap-2">{[["MODALITY","T1W"],["SOURCE","MRI"],["RENDER","STATIC / SAFE"],["STATE","ONLINE"]].map(([a,b])=><div key={a} className="rounded-lg border border-white/10 bg-black/25 p-3"><div className="text-[7px] text-white/20">{a}</div><div className="mt-1 text-[10px] text-white/65">{b}</div></div>)}</div><div className="mt-5 border-t border-white/10 pt-4 text-[9px] leading-5 text-white/25">Colored pathways and navigation points are simulated presentation layers, not measured neural activity.</div><div className="mt-4 text-[8px] text-white/20">MRI reference: Asnaebsa / Wikimedia Commons / CC BY-SA 4.0.</div>
        </aside>
      </div>
    </div>
  </section>;
}
