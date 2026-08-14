import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "ANATOMY" | "TRACTS" | "EEG" | "NANOBOTS" | "CONNECTOME";
type Point = { x:number; y:number; z:number; a:number };
type Track = number[][];

const MODES: {id:Mode; label:string; desc:string}[] = [
  {id:"ANATOMY", label:"3D anatomy", desc:"Volumetric T1 reconstruction"},
  {id:"TRACTS", label:"Tractography", desc:"Fiber pathway exploration"},
  {id:"EEG", label:"EEG fusion", desc:"Temporal neural signal mapping"},
  {id:"NANOBOTS", label:"NIMBLE navigation", desc:"Simulated microscopic agents"},
  {id:"CONNECTOME", label:"Connectome", desc:"Network topology explorer"},
];

function seeded(n:number){ let s=n>>>0; return ()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296}; }
function demoPoints(count=6200):Point[]{
  const r=seeded(9182), out:Point[]=[];
  for(let i=0;i<count;i++){
    const t=r()*Math.PI*2, p=Math.acos(2*r()-1), shell=.86+r()*.22;
    const fissure=Math.abs(Math.cos(t))<.055 ? .22 : 0;
    const g=.035*Math.sin(t*12+p*8)+.025*Math.sin(t*25-p*5);
    const x=Math.sin(p)*Math.cos(t)*(1.12+g)*shell;
    const y=Math.sin(p)*Math.sin(t)*(.84+g-fissure)*shell;
    const z=Math.cos(p)*(.98+g)*shell;
    if(Math.abs(x)<.055 && r()<.68) continue;
    out.push({x,y,z,a:.35+r()*.65});
  }
  return out;
}
function demoTracks(count=34):Track[]{
  const r=seeded(4431), tracks:Track[]=[];
  for(let k=0;k<count;k++){
    const pts:number[][]=[]; const y0=(r()-.5)*1.25, z0=(r()-.5)*1.1, bend=(r()-.5)*.7;
    for(let i=0;i<34;i++){
      const q=i/33, x=-1.15+2.3*q, y=y0+Math.sin(q*Math.PI*(1.1+r()*1.4)+k)*.16+bend*(q-.5), z=z0+Math.cos(q*Math.PI*1.7+k*.31)*.13;
      pts.push([x,y,z]);
    }
    tracks.push(pts);
  }
  return tracks;
}
function project(x:number,y:number,z:number,w:number,h:number,rx:number,ry:number){
  const cy=Math.cos(ry), sy=Math.sin(ry), cx=Math.cos(rx), sx=Math.sin(rx);
  let X=x*cy-z*sy, Z=x*sy+z*cy, Y=y*cx-Z*sx; Z=y*sx+Z*cx;
  const d=2.8/(3.8-Z); return {x:w*.5+X*w*.29*d,y:h*.5+Y*h*.39*d,z:Z,d};
}

function Hologram({mode, points, tracks}:{mode:Mode; points:Point[]; tracks:Track[]}){
  const ref=useRef<HTMLCanvasElement>(null); const mouse=useRef({x:0,y:0}); const rot=useRef({x:-.12,y:.45});
  useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;let raf=0,t=0;
    const resize=()=>{const d=Math.min(devicePixelRatio||1,2);c.width=c.clientWidth*d;c.height=c.clientHeight*d;ctx.setTransform(d,0,0,d,0,0)};
    const draw=()=>{t+=.012;const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);rot.current.y+=.0018;rot.current.x+=(mouse.current.y*.22-rot.current.x)*.025;
      const color=mode==="TRACTS"?[75,224,255]:mode==="EEG"?[113,255,187]:mode==="NANOBOTS"?[255,184,72]:mode==="CONNECTOME"?[194,128,255]:[79,210,238];
      const pts=points.map(p=>({...project(p.x,p.y,p.z,w,h,rot.current.x,rot.current.y),a:p.a})).sort((a,b)=>a.z-b.z);
      for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.35,1.25*p.d),0,Math.PI*2);ctx.fillStyle=`rgba(${color.join(",")},${.16+p.a*.52})`;ctx.fill()}
      if(mode==="TRACTS") for(const tr of tracks){ctx.beginPath();tr.forEach((q,i)=>{const p=project(q[0],q[1],q[2],w,h,rot.current.x,rot.current.y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.strokeStyle=`rgba(65,224,255,.34)`;ctx.lineWidth=.8;ctx.stroke()}
      if(mode==="CONNECTOME"||mode==="NANOBOTS"){for(let i=0;i<18;i++){const a=i*.73+t*(mode==="NANOBOTS"?1.5:.22);const p=project(Math.cos(a)*.75,Math.sin(a*1.7)*.42,Math.sin(a)*.68,w,h,rot.current.x,rot.current.y);ctx.beginPath();ctx.arc(p.x,p.y,mode==="NANOBOTS"?2.6:2,0,Math.PI*2);ctx.fillStyle=`rgba(${color.join(",")},.95)`;ctx.shadowBlur=14;ctx.shadowColor=`rgba(${color.join(",")},.85)`;ctx.fill();ctx.shadowBlur=0}}
      if(mode==="EEG"){const y=h*.78;ctx.beginPath();for(let i=0;i<w*.72;i++){const x=w*.14+i;const yy=y+Math.sin(i*.08+t*5)*5+Math.sin(i*.027+t*2)*9; i?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.strokeStyle="rgba(113,255,187,.85)";ctx.lineWidth=1.1;ctx.stroke()}
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(t*.08);for(const s of [1,.86,.72]){ctx.beginPath();ctx.ellipse(0,0,Math.min(w,h)*.34*s,Math.min(w,h)*.095*s,0,0,Math.PI*2);ctx.strokeStyle=`rgba(${color.join(",")},${s===.86?.15:.06})`;ctx.stroke()}ctx.restore();
      if(mode!=="ANATOMY"){const scan=(t*55)%(h+120)-60;ctx.fillStyle=`rgba(${color.join(",")},.35)`;ctx.fillRect(w*.16,scan,w*.68,1)}
      raf=requestAnimationFrame(draw)};
    resize();window.addEventListener("resize",resize);draw();return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)};
  },[mode,points,tracks]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();mouse.current={x:e.clientX/r.width-.5,y:e.clientY/r.height-.5}}} onMouseLeave={()=>mouse.current={x:0,y:0}}/>;
}

function parseNifti(buffer:ArrayBuffer): {points:Point[]; dims:[number,number,number]; voxels:number} | null {
  const view=new DataView(buffer); if(view.byteLength<352)return null;
  const le=view.getInt32(0,true)===348; const i16=(o:number)=>view.getInt16(o,le), i32=(o:number)=>view.getInt32(o,le), f32=(o:number)=>view.getFloat32(o,le);
  if(i32(0)!==348 && !le) return null;
  const nx=i16(42), ny=i16(44), nz=i16(46), datatype=i16(70), bitpix=i16(72), voxOffset=Math.max(352,f32(108));
  if(nx<2||ny<2||nz<2||nx>2048||ny>2048||nz>2048)return null;
  const count=nx*ny*nz, bytes=Math.max(1,bitpix/8); if(voxOffset+count*bytes>view.byteLength)return null;
  const slope=f32(112)||1, inter=f32(116)||0, maxPoints=14000, step=Math.max(1,Math.ceil(Math.cbrt(count/maxPoints))); const pts:Point[]=[];
  const read=(idx:number)=>{const o=voxOffset+idx*bytes;switch(datatype){case 2:return view.getUint8(o);case 4:return view.getInt16(o,le);case 8:return view.getInt32(o,le);case 16:return view.getFloat32(o,le);case 64:return view.getFloat64(o,le);case 512:return view.getUint16(o,le);case 768:return view.getUint32(o,le);default:return 0}};
  let lo=Infinity,hi=-Infinity; for(let z=0;z<nz;z+=step)for(let y=0;y<ny;y+=step)for(let x=0;x<nx;x+=step){const v=read(x+nx*(y+ny*z))*slope+inter;if(Number.isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v)}}
  const range=hi-lo||1; for(let z=0;z<nz;z+=step)for(let y=0;y<ny;y+=step)for(let x=0;x<nx;x+=step){const v=read(x+nx*(y+ny*z))*slope+inter,n=(v-lo)/range;if(n>.18){pts.push({x:(x/(nx-1)-.5)*2.2,y:(y/(ny-1)-.5)*1.7,z:(z/(nz-1)-.5)*1.9,a:Math.min(1,.2+n*.9)})}} return {points:pts,dims:[nx,ny,nz],voxels:count};
}
function parseEEG(text:string){const rows=text.trim().split(/\r?\n/).map(r=>r.split(/[\s,;]+/).map(Number).filter(Number.isFinite));return rows.filter(r=>r.length>1).slice(0,16000)}

function Uploader({onMRI,onEEG,onTracks}:{onMRI:(x:{points:Point[];name:string;dims:[number,number,number]})=>void;onEEG:(x:{rows:number[][];name:string})=>void;onTracks:(x:{tracks:Track[];name:string})=>void}){
  const [status,setStatus]=useState("");
  const load=async(file:File)=>{setStatus(`Parsing ${file.name}…`);try{const ext=file.name.toLowerCase();if(ext.endsWith(".nii")||ext.endsWith(".nii.gz")){let b=await file.arrayBuffer();if(ext.endsWith(".gz")){const DS=(window as any).DecompressionStream;if(!DS)throw new Error("Browser gzip decoding unavailable");b=await new Response(new Blob([b]).stream().pipeThrough(new DS("gzip"))).arrayBuffer()}const parsed=parseNifti(b);if(!parsed)throw new Error("Unsupported or invalid NIfTI volume");onMRI({points:parsed.points,name:file.name,dims:parsed.dims});setStatus(`MRI loaded · ${parsed.dims.join(" × ")} · ${parsed.points.length.toLocaleString()} rendered voxels`)}else if(ext.endsWith(".csv")||ext.endsWith(".txt")||ext.endsWith(".tsv")){const rows=parseEEG(await file.text());if(!rows.length)throw new Error("No numeric EEG samples found");onEEG({rows,name:file.name});setStatus(`EEG loaded · ${rows.length.toLocaleString()} samples`)}else if(ext.endsWith(".json")){const j=JSON.parse(await file.text());const raw=j.streamlines||j.tracks||j;const tracks=Array.isArray(raw)?raw.filter((t:any)=>Array.isArray(t)&&t.length>2).slice(0,500):[];if(!tracks.length)throw new Error("Expected JSON streamlines / tracks");onTracks({tracks,name:file.name});setStatus(`Tractography loaded · ${tracks.length} streamlines`)}else throw new Error("Use .nii/.nii.gz, EEG .csv/.txt/.tsv, or tractography .json")}catch(e){setStatus(e instanceof Error?e.message:"Could not parse file")}};
  return <div className="grid gap-2 sm:grid-cols-3"><label className="group cursor-pointer rounded-xl border border-cyan-300/15 bg-cyan-300/[.025] p-4 transition hover:border-cyan-300/40"><div className="font-mono text-[7px] tracking-[.25em] text-cyan-200/55">01 / MRI VOLUME</div><div className="mt-2 text-sm text-white/75">Upload NIfTI 3D</div><div className="mt-1 text-[10px] text-white/30">.nii · .nii.gz</div><input type="file" accept=".nii,.gz" className="hidden" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/></label><label className="group cursor-pointer rounded-xl border border-emerald-300/15 bg-emerald-300/[.025] p-4 transition hover:border-emerald-300/40"><div className="font-mono text-[7px] tracking-[.25em] text-emerald-200/55">02 / EEG STREAM</div><div className="mt-2 text-sm text-white/75">Upload EEG sample</div><div className="mt-1 text-[10px] text-white/30">CSV · TXT · TSV</div><input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/></label><label className="group cursor-pointer rounded-xl border border-violet-300/15 bg-violet-300/[.025] p-4 transition hover:border-violet-300/40"><div className="font-mono text-[7px] tracking-[.25em] text-violet-200/55">03 / TRACTOGRAPHY</div><div className="mt-2 text-sm text-white/75">Upload streamlines</div><div className="mt-1 text-[10px] text-white/30">JSON track set</div><input type="file" accept=".json" className="hidden" onChange={e=>e.target.files?.[0]&&load(e.target.files[0])}/></label><div className="sm:col-span-3 font-mono text-[7px] tracking-[.12em] text-white/25">{status||"All processing happens locally in this demo session; files are not uploaded by this interface."}</div></div>
}

export function NimbleResearchStudio(){
  const [mode,setMode]=useState<Mode>("ANATOMY"); const [points,setPoints]=useState<Point[]>(()=>demoPoints()); const [tracks,setTracks]=useState<Track[]>(()=>demoTracks()); const [eeg,setEeg]=useState<number[][]>([]); const [dataset,setDataset]=useState("DEMO / T1W"); const [dims,setDims]=useState<[number,number,number]>([192,192,160]);
  const feature=useMemo(()=>({ANATOMY:["CORTICAL SURFACE","T1 INTENSITY","VOLUME 3D"],TRACTS:["FA MAP","STREAMLINES","ROI FILTER"],EEG:["THETA","ALPHA","BETA / GAMMA"],NANOBOTS:["AGENT POOL","TARGET ROI","PATH PLANNER"],CONNECTOME:["NODES","EDGES","COMMUNITY"]}[mode]),[mode]);
  return <section className="min-h-screen bg-[#020406] text-white"><style>{`@keyframes pulse2{50%{opacity:.35}}`}</style><div className="mx-auto max-w-[1800px] px-4 py-6 lg:px-8 lg:py-10"><header className="mb-4 flex items-end justify-between border-b border-white/10 pb-5"><div><div className="font-mono text-[8px] tracking-[.45em] text-cyan-300/55">COGNIVANCE LABS / NIMBLE / RESEARCH OS</div><h1 className="mt-3 text-3xl font-medium tracking-[-.055em] sm:text-5xl">Neural systems observatory</h1><p className="mt-2 max-w-2xl text-sm text-white/35">A multimodal workspace for volumetric MRI, tractography and electrophysiology exploration.</p></div><div className="hidden text-right font-mono text-[7px] tracking-[.2em] text-white/30 md:block"><div className="text-cyan-200/65">SESSION ACTIVE</div><div className="mt-2">LOCAL PROCESSING / NO CLOUD UPLOAD</div></div></header>
    <Uploader onMRI={x=>{setPoints(x.points);setDims(x.dims);setDataset(x.name);setMode("ANATOMY")}} onEEG={x=>{setEeg(x.rows);setDataset(x.name);setMode("EEG")}} onTracks={x=>{setTracks(x.tracks);setDataset(x.name);setMode("TRACTS")}}/>
    <div className="mt-3 grid gap-3 xl:grid-cols-[210px_minmax(0,1fr)_310px]"><aside className="rounded-xl border border-white/10 bg-[#070a0d]/95 p-3"><div className="font-mono text-[7px] tracking-[.3em] text-white/30">DATASETS</div><div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[.035] p-3"><div className="font-mono text-[6px] text-cyan-200/55">ACTIVE VOLUME</div><div className="mt-2 truncate text-[11px] text-white/70">{dataset}</div><div className="mt-2 font-mono text-[6px] text-white/25">{dims.join(" × ")} VOXELS</div></div><div className="mt-3 space-y-2">{["CORTEX","SUBCORTICAL","CEREBELLUM","BRAINSTEM"].map((x,i)=><button key={x} className="flex w-full items-center justify-between rounded-lg border border-white/8 bg-black/20 p-3 text-left text-[9px] text-white/45 hover:text-white/75"><span>{x}</span><span className="font-mono text-[6px] text-white/20">ROI {String(i+1).padStart(2,"0")}</span></button>)}</div><div className="mt-4 rounded-lg border border-white/8 p-3"><div className="font-mono text-[6px] tracking-[.2em] text-white/25">PIPELINE</div><div className="mt-3 space-y-2 font-mono text-[6px]">{["INGEST","NORMALIZE","REGISTER","RECONSTRUCT","ANALYZE"].map((x,i)=><div key={x} className="flex items-center gap-2 text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70"/>{x}<span className="ml-auto text-cyan-200/35">{i<4?"OK":"LIVE"}</span></div>)}</div></div></aside>
    <main className="relative min-h-[620px] overflow-hidden rounded-xl border border-white/10 bg-[#030608]"><div className="absolute left-4 top-4 z-20 font-mono text-[7px] tracking-[.25em] text-white/35">3D MULTIMODAL VIEWPORT / {mode}</div><div className="absolute right-4 top-4 z-20 rounded-full border border-emerald-300/20 bg-emerald-300/[.04] px-2 py-1 font-mono text-[6px] tracking-[.2em] text-emerald-200/65">● COMPUTE ONLINE</div><Hologram mode={mode} points={points} tracks={tracks}/><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,.52)_100%)]"/><div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-between font-mono text-[6px] tracking-[.16em] text-white/20"><span>AXIAL / CORONAL / SAGITTAL</span><span>DEPTH FIELD 3D</span><span>SIMULATION / RESEARCH</span></div></main>
    <aside className="rounded-xl border border-white/10 bg-[#070a0d]/95 p-3"><div className="font-mono text-[7px] tracking-[.3em] text-white/30">ANALYSIS MODULES</div><div className="mt-3 space-y-2">{MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className={`w-full rounded-lg border p-3 text-left transition ${mode===m.id?"border-cyan-300/35 bg-cyan-300/[.055]":"border-white/8 bg-black/20 hover:border-white/20"}`}><div className="flex items-center justify-between"><span className="text-[9px] text-white/75">{m.label}</span><span className={`h-1.5 w-1.5 rounded-full ${mode===m.id?"bg-cyan-300 shadow-[0_0_10px_rgba(70,220,255,.8)]":"bg-white/15"}`}/></div><div className="mt-1 font-mono text-[6px] text-white/28">{m.desc}</div></button>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{feature.map(x=><div key={x} className="rounded-lg border border-white/8 bg-black/20 p-3"><div className="font-mono text-[6px] text-white/25">LAYER</div><div className="mt-1 text-[8px] text-white/60">{x}</div></div>)}</div><div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3"><div className="flex justify-between font-mono text-[6px] text-white/25"><span>EEG CHANNELS</span><span>{eeg.length?Math.min(16,eeg[0]?.length||1):"—"}</span></div><div className="mt-3 h-20 overflow-hidden">{eeg.length?<svg viewBox="0 0 300 80" preserveAspectRatio="none" className="h-full w-full">{Array.from({length:Math.min(6,eeg[0]?.length||1)},(_,ch)=><path key={ch} d={eeg.slice(0,900).map((r,i)=>`${i===0?"M":"L"}${(i/899)*300},${42-ch*10-Math.max(-14,Math.min(14,(r[ch]||0)*2))}`).join(" ")} fill="none" stroke={`hsl(${155+ch*22} 80% 65% / .7)`} strokeWidth="1"/></svg>:<div className="font-mono text-[7px] leading-5 text-white/20">Upload EEG to unlock temporal fusion.</div>}</div></div><div className="mt-3 grid grid-cols-2 gap-2">{[["NODES","18,240"],["TRACTS",tracks.length.toLocaleString()],["LATENCY","12 ms"],["STATE","STABLE"]].map(([a,b])=><div key={a} className="rounded-lg border border-white/8 p-3"><div className="font-mono text-[6px] text-white/20">{a}</div><div className="mt-1 text-[10px] text-white/60">{b}</div></div>)}</div></aside></div>
    <div className="mt-3 grid gap-3 md:grid-cols-4"><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><div className="font-mono text-[7px] tracking-[.25em] text-cyan-200/45">TRACTOGRAPHY</div><div className="mt-2 text-sm text-white/70">ROI fiber interrogation</div><p className="mt-1 text-[10px] leading-5 text-white/25">Explore pathway density, direction and simulated bundle selection.</p></div><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><div className="font-mono text-[7px] tracking-[.25em] text-emerald-200/45">EEG × MRI</div><div className="mt-2 text-sm text-white/70">Temporal fusion</div><p className="mt-1 text-[10px] leading-5 text-white/25">Map uploaded electrophysiology against anatomical coordinates.</p></div><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><div className="font-mono text-[7px] tracking-[.25em] text-violet-200/45">CONNECTOME</div><div className="mt-2 text-sm text-white/70">Network topology</div><p className="mt-1 text-[10px] leading-5 text-white/25">Inspect nodes, edges and community structure as an interactive layer.</p></div><div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><div className="font-mono text-[7px] tracking-[.25em] text-amber-200/45">NIMBLE</div><div className="mt-2 text-sm text-white/70">Microscale mission planner</div><p className="mt-1 text-[10px] leading-5 text-white/25">Visualize simulated agent routing and target-ROI trajectories.</p></div></div>
    <div className="mt-4 text-center font-mono text-[6px] tracking-[.15em] text-white/20">RESEARCH VISUALIZATION · UPLOADED DATA REMAINS LOCAL TO THIS DEMO SESSION · NOT FOR CLINICAL DIAGNOSIS</div></div></section>
}
