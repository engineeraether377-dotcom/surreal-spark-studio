import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Brain, CircleDot, Download, LogOut, RotateCcw, ScanSearch, Upload, Waves, X, Maximize2 } from "lucide-react";
import { VolumeBrain, type VolumeData } from "./VolumeBrain";

type Mode = "ANATOMY" | "TRACTS" | "EEG" | "NANOBOTS" | "CONNECTOME";
type Track = number[][];
const MODES: [Mode,string,string,any][] = [
  ["ANATOMY","3D anatomy","T1-weighted volumetric reconstruction",Brain],
  ["TRACTS","Tractography","3D fiber pathway reconstruction",ScanSearch],
  ["EEG","EEG fusion","Temporal electrophysiology overlay",Waves],
  ["NANOBOTS","NIMBLE navigation","Microscale route simulation",CircleDot],
  ["CONNECTOME","Connectome","Structural network analysis",Activity],
];
const ROIS = ["Cortex","Hippocampus","Motor cortex","Thalamus","Corpus callosum","Visual cortex"];
const rand = (seed:number) => { let n=seed>>>0; return () => { n=(n*1664525+1013904223)>>>0; return n/4294967296; }; };

function demoVolume(size=112): VolumeData {
  const data=new Uint8Array(size**3), c=(size-1)/2;
  for(let z=0;z<size;z++) for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const X=(x-c)/c,Y=(y-c)/c,Z=(z-c)/c;
    const shell=X*X/.88+Y*Y/.76+Z*Z/.82;
    const folds=.055*Math.sin(Y*34+Z*5)+.035*Math.sin(Y*57-Z*7)+.022*Math.sin((Y+Z)*74);
    const hemi=Math.abs(X)>.045;
    const vent=(X/.18)**2+((Y+.02)/.27)**2+((Z+.02)/.25)**2<1;
    let v=shell<1+folds&&hemi?.12+Math.max(0,1-shell)*.78:0;
    if(vent)v*=.16;
    const deep=Math.exp(-((X*X)/.25+((Y+.03)**2)/.25+((Z+.02)**2)/.3));
    data[x+size*(y+size*z)]=Math.round(Math.min(1,v+deep*.12)*255);
  }
  return {data,size:[size,size,size]};
}

function fibers(n=820): Track[] {
  const r=rand(712), out:Track[]=[];
  for(let k=0;k<n;k++) {
    const bundle=k%10, side=k%2?-1:1, q:number[][]=[];
    const y0=(r()-.5)*1.05,z0=(r()-.5)*.82;
    for(let i=0;i<100;i++) {
      const t=i/99, curve=Math.sin(t*Math.PI), spread=(r()-.5)*.045;
      let x=-1.25+2.5*t,y=y0+spread,z=z0+spread;
      if(bundle===0){y*=.34;z+=curve*.28*side}
      else if(bundle===1){y+=curve*.4*side;z+=curve*.08}
      else if(bundle===2){y+=Math.sin(t*Math.PI*1.4)*.22;z+=curve*.32}
      else if(bundle===3){x+=curve*.22*side;z+=curve*.55*side}
      else if(bundle===4){y-=curve*.42;z+=curve*.12}
      else if(bundle===5){y+=curve*.25;z-=curve*.4}
      else if(bundle===6){x+=Math.sin(t*Math.PI*2)*.18;y+=curve*.2*side}
      else if(bundle===7){y+=Math.sin(t*Math.PI*3)*.12;z+=curve*.22}
      else if(bundle===8){x+=curve*.12;y-=curve*.3*side}
      else{x*=.9;y+=curve*.48*side;z+=curve*.12}
      q.push([x,y,z]);
    }
    out.push(q);
  }
  return out;
}

function parseNifti(buffer:ArrayBuffer): {volume:VolumeData;dims:[number,number,number];stats:Record<string,string>}|null {
  const v=new DataView(buffer); if(v.byteLength<352)return null;
  const le=v.getInt32(0,true)===348; if(!le&&v.getInt32(0,false)!==348)return null;
  const i16=(o:number)=>v.getInt16(o,le), i32=(o:number)=>v.getInt32(o,le), f32=(o:number)=>v.getFloat32(o,le);
  const nx=i16(42),ny=i16(44),nz=i16(46),dt=i16(70),bp=i16(72);
  const slope=f32(112)||1, intercept=f32(116)||0, rawOffset=f32(108); const off=Math.max(352,Number.isFinite(rawOffset)?rawOffset:352);
  if(nx<2||ny<2||nz<2||bp%8!==0)return null;
  const bytes=bp/8,count=nx*ny*nz; if(off+count*bytes>v.byteLength)return null;
  const readRaw=(idx:number):number=>{const o=off+idx*bytes;switch(dt){case 2:return v.getUint8(o);case 4:return v.getInt16(o,le);case 8:return v.getInt32(o,le);case 16:return v.getFloat32(o,le);case 64:return v.getFloat64(o,le);case 256:return v.getInt8(o);case 512:return v.getUint16(o,le);case 768:return v.getUint32(o,le);default:return 0;}};
  const read=(idx:number)=>readRaw(idx)*slope+intercept;
  const sampleStep=Math.max(1,Math.ceil(Math.cbrt(count/180000)));
  let lo=Infinity,hi=-Infinity,sum=0,n=0;
  for(let z=0;z<nz;z+=sampleStep)for(let y=0;y<ny;y+=sampleStep)for(let x=0;x<nx;x+=sampleStep){const q=read(x+nx*(y+ny*z));if(Number.isFinite(q)){lo=Math.min(lo,q);hi=Math.max(hi,q);sum+=q;n++;}}
  if(!Number.isFinite(lo)||!Number.isFinite(hi))return null;
  const outSize=112,out=new Uint8Array(outSize**3),range=hi-lo||1;
  // Trilinear resampling smooths the browser representation while retaining the uploaded voxel field.
  for(let z=0;z<outSize;z++)for(let y=0;y<outSize;y++)for(let x=0;x<outSize;x++){
    const fx=x*(nx-1)/(outSize-1),fy=y*(ny-1)/(outSize-1),fz=z*(nz-1)/(outSize-1);
    const x0=Math.floor(fx),y0=Math.floor(fy),z0=Math.floor(fz),x1=Math.min(nx-1,x0+1),y1=Math.min(ny-1,y0+1),z1=Math.min(nz-1,z0+1);
    const xd=fx-x0,yd=fy-y0,zd=fz-z0;
    const c000=read(x0+nx*(y0+ny*z0)),c100=read(x1+nx*(y0+ny*z0)),c010=read(x0+nx*(y1+ny*z0)),c110=read(x1+nx*(y1+ny*z0));
    const c001=read(x0+nx*(y0+ny*z1)),c101=read(x1+nx*(y0+ny*z1)),c011=read(x0+nx*(y1+ny*z1)),c111=read(x1+nx*(y1+ny*z1));
    const c00=c000+(c100-c000)*xd,c10=c010+(c110-c010)*xd,c01=c001+(c101-c001)*xd,c11=c011+(c111-c011)*xd;
    const c0=c00+(c10-c00)*yd,c1=c01+(c11-c01)*yd,q=(c0+(c1-c0)*zd-lo)/range;
    out[x+outSize*(y+outSize*z)]=Math.round(Math.max(0,Math.min(1,q))*255);
  }
  return {volume:{data:out,size:[outSize,outSize,outSize]},dims:[nx,ny,nz],stats:{VOXELS:count.toLocaleString(),MIN:lo.toPrecision(6),MAX:hi.toPrecision(6),MEAN:(sum/Math.max(1,n)).toPrecision(6),DATATYPE:String(dt),BITPIX:String(bp)}};
}

function FiberField({tracks}:{tracks:Track[]}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current;if(!c)return;const ctx=c.getContext("2d")!;let id=0,rot=.3;const resize=()=>{const d=Math.min(devicePixelRatio||1,2);c.width=c.clientWidth*d;c.height=c.clientHeight*d;ctx.setTransform(d,0,0,d,0,0)};const draw=()=>{rot+=.00045;const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);for(const [k,tr] of tracks.entries()){ctx.beginPath();tr.forEach((q,i)=>{const x=q[0]*Math.cos(rot)-q[2]*Math.sin(rot),z=q[0]*Math.sin(rot)+q[2]*Math.cos(rot),d=3/(3.7-z),sx=w/2+x*w*.29*d,sy=h/2+q[1]*h*.34*d;i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy)});const hue=k%3===0?190:k%3===1?215:278;ctx.strokeStyle=`hsla(${hue},100%,78%,${k%8===0?.86:.5})`;ctx.lineWidth=k%8===0?2.6:1.05;ctx.shadowBlur=k%8===0?10:3;ctx.shadowColor=`hsla(${hue},100%,70%,.7)`;ctx.stroke()}ctx.shadowBlur=0;id=requestAnimationFrame(draw)};resize();window.addEventListener("resize",resize);draw();return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize)}},[tracks]);return <canvas ref={ref} className="absolute inset-0 h-full w-full"/>}

function EEGField(){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current;if(!c)return;const x=c.getContext("2d")!;let id=0,t=0;const draw=()=>{t+=.018;x.clearRect(0,0,c.width,c.height);for(let ch=0;ch<8;ch++){x.beginPath();for(let i=0;i<c.width;i+=2){const y=25+ch*44+Math.sin(i*.026+t*(1+ch*.03))*7+Math.sin(i*.11+t*2.1)*2+Math.sin(i*.006+t*.4)*12;i?x.lineTo(i,y):x.moveTo(i,y)}x.strokeStyle=`rgba(76,245,190,${.82-ch*.055})`;x.lineWidth=1.3;x.stroke()}id=requestAnimationFrame(draw)};draw();return()=>cancelAnimationFrame(id)},[]);return <canvas ref={ref} width={900} height={390} className="h-full w-full"/>}

function AnalysisWindow({volume,dims,stats,tracks,onClose}:{volume:VolumeData;dims:[number,number,number];stats:Record<string,string>;tracks:Track[];onClose:()=>void}){const [tab,setTab]=useState("SUMMARY");const meanFiber=tracks.reduce((s,t)=>s+t.slice(1).reduce((a,q,i)=>a+Math.hypot(q[0]-t[i][0],q[1]-t[i][1],q[2]-t[i][2]),0),0)/Math.max(1,tracks.length);return <div className="fixed inset-0 z-50 bg-black/80 p-3 backdrop-blur-xl sm:p-6"><div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#05080b] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><div className="font-mono text-[7px] tracking-[.35em] text-cyan-200/50">NIMBLE / LIVE ANALYSIS ENGINE</div><h2 className="mt-1 text-lg text-white/90">Multimodal analysis session</h2></div><button onClick={onClose} aria-label="Close analysis" className="rounded-full border border-white/10 p-2 text-white/45 hover:text-white"><X size={15}/></button></div><div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">{["SUMMARY","VOLUME","TRACTOGRAPHY","EEG","QC"].map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-lg px-4 py-2 font-mono text-[7px] tracking-[.18em] ${tab===t?"bg-cyan-300/10 text-cyan-100":"text-white/35 hover:bg-white/5"}`}>{t}</button>)}</div><div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">{tab==="SUMMARY"&&<div className="grid gap-3 md:grid-cols-3"><Metric title="MRI VOLUME" value={`${dims.join(" × ")}`} sub="source voxel dimensions"/><Metric title="VOXELS" value={stats.VOXELS||"—"} sub="native volume count"/><Metric title="TRACTOGRAPHY" value={tracks.length.toLocaleString()} sub={`mean length ${meanFiber.toFixed(3)} units`}/><div className="md:col-span-3 rounded-xl border border-cyan-200/10 bg-cyan-200/[.02] p-5"><div className="font-mono text-[7px] tracking-[.22em] text-cyan-200/45">COMPUTED ANALYSIS</div><div className="mt-4 grid gap-3 text-sm text-white/55 md:grid-cols-3"><div>Intensity range: <span className="text-white/80">{stats.MIN} → {stats.MAX}</span></div><div>Mean intensity: <span className="text-white/80">{stats.MEAN}</span></div><div>Representation: <span className="text-white/80">112³ smoothed volume</span></div></div></div></div>}{tab==="VOLUME"&&<div className="relative h-[650px] overflow-hidden rounded-xl border border-white/10 bg-black"><VolumeBrain volume={volume} mode="ANATOMY"/><div className="absolute left-4 top-4 font-mono text-[7px] leading-4 text-cyan-100/45">3D VOLUME<br/>TRILINEAR RESAMPLE<br/>LOCAL VOXEL DATA</div></div>}{tab==="TRACTOGRAPHY"&&<div className="relative h-[650px] overflow-hidden rounded-xl border border-cyan-200/10 bg-[#020507]"><FiberField tracks={tracks}/><div className="absolute left-4 top-4 font-mono text-[7px] text-cyan-100/55">TRACTOGRAPHY / DENSE STREAMLINE FIELD</div></div>}{tab==="EEG"&&<div className="h-[620px] rounded-xl border border-emerald-200/10 bg-black p-4"><div className="mb-3 font-mono text-[7px] text-emerald-200/50">EEG / MULTICHANNEL TRACE</div><div className="h-[540px]"><EEGField/></div></div>}{tab==="QC"&&<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{Object.entries(stats).map(([k,v])=><div key={k} className="rounded-xl border border-white/10 p-4"><div className="font-mono text-[7px] text-white/25">{k}</div><div className="mt-3 text-sm text-white/75">{v}</div></div>)}</div>}</div></div></div>}
function Metric({title,value,sub}:{title:string;value:string;sub:string}){return <div className="rounded-xl border border-white/10 bg-white/[.015] p-5"><div className="font-mono text-[7px] tracking-[.2em] text-white/25">{title}</div><div className="mt-4 text-2xl font-light text-white/85">{value}</div><div className="mt-2 font-mono text-[7px] text-cyan-200/40">{sub}</div></div>}

export function NimbleResearchStudioV2(){
  const navigate=useNavigate();
  const [mode,setMode]=useState<Mode>("ANATOMY");
  const [volume,setVolume]=useState<VolumeData>(()=>demoVolume());
  const [dims,setDims]=useState<[number,number,number]>([112,112,112]);
  const [stats,setStats]=useState<Record<string,string>>({VOXELS:"1,404,928",MIN:"0",MAX:"255",MEAN:"—",DATATYPE:"demo",BITPIX:"8"});
  const [dataset,setDataset]=useState("DEMO / T1-WEIGHTED");
  const [tracks,setTracks]=useState<Track[]>(()=>fibers());
  const [roi,setRoi]=useState("Cortex");
  const [analysis,setAnalysis]=useState(false);
  const [status,setStatus]=useState("READY");
  const [toast,setToast]=useState("");
  const notify=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),2200)};
  const loadMRI=async(file:File)=>{try{setStatus("PARSING NIFTI");let b=await file.arrayBuffer();if(file.name.toLowerCase().endsWith(".gz")){const D=(window as any).DecompressionStream;if(!D)throw new Error("This browser cannot decode gzip NIfTI");b=await new Response(new Blob([b]).stream().pipeThrough(new D("gzip"))).arrayBuffer();}const parsed=parseNifti(b);if(!parsed)throw new Error("Unsupported or invalid NIfTI header");setVolume(parsed.volume);setDims(parsed.dims);setStats(parsed.stats);setDataset(file.name.toUpperCase());setMode("ANATOMY");setStatus("VOLUME READY");setAnalysis(true);notify("NIfTI volume reconstructed");}catch(e){setStatus("LOAD ERROR");notify(e instanceof Error?e.message:"NIfTI load failed")}};
  const loadTracts=async(file:File)=>{try{const text=await file.text();const json=JSON.parse(text);const candidate=Array.isArray(json)?json:(json.streamlines||json.tracks||json.fibers);if(!Array.isArray(candidate))throw new Error("Expected an array of streamlines");const parsed=candidate.filter((t:any)=>Array.isArray(t)&&t.length>2).map((t:any)=>t.map((p:any)=>Array.isArray(p)?[Number(p[0]),Number(p[1]),Number(p[2])]:[0,0,0])).filter((t:any)=>t.length>2);if(!parsed.length)throw new Error("No valid streamlines found");setTracks(parsed);setMode("TRACTS");setAnalysis(true);notify(`${parsed.length.toLocaleString()} streamlines loaded`);}catch(e){notify(e instanceof Error?e.message:"Tractography load failed")}};
  const exportPNG=()=>{const canvas=document.querySelector("canvas");if(!canvas){notify("No visualization canvas available");return;}const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`nimble-${mode.toLowerCase()}.png`;a.click();notify("Visualization exported");};
  const reset=()=>{setVolume(demoVolume());setDims([112,112,112]);setStats({VOXELS:"1,404,928",MIN:"0",MAX:"255",MEAN:"—",DATATYPE:"demo",BITPIX:"8"});setDataset("DEMO / T1-WEIGHTED");setTracks(fibers());setMode("ANATOMY");setStatus("READY");notify("Reference dataset restored")};
  const modeInfo=useMemo(()=>MODES.find(x=>x[0]===mode)!,[mode]);
  const logout=()=>{localStorage.removeItem("cognivance_session");navigate({to:"/auth"});};
  return <div className="min-h-screen bg-[#020405] text-white"><div className="mx-auto max-w-[1900px] px-3 py-3 sm:px-5 lg:px-7"><header className="mb-3 flex items-center justify-between border-b border-white/10 pb-3"><div><div className="font-mono text-[7px] tracking-[.42em] text-cyan-200/45">COGNIVANCE LABS / NIMBLE / MULTIMODAL ANALYSIS</div><div className="mt-2 text-xl font-medium tracking-[-.035em]">Neural systems observatory</div></div><div className="flex items-center gap-2"><button onClick={()=>navigate({to:"/"})} className="rounded-full border border-white/10 px-4 py-2 font-mono text-[7px] tracking-[.18em] text-white/45 hover:border-cyan-300/30 hover:text-cyan-100">← HOME</button><button onClick={logout} className="flex items-center gap-2 rounded-full border border-red-200/10 px-4 py-2 font-mono text-[7px] tracking-[.18em] text-red-100/45 hover:border-red-200/30 hover:text-red-100"><LogOut size={11}/> LOGOUT</button></div></header>
    <div className="grid min-h-[calc(100vh-105px)] gap-3 xl:grid-cols-[245px_minmax(0,1fr)_300px]">
      <aside className="space-y-3"><Panel title="DATA INGEST"><UploadBox title="3D MRI / NIFTI" sub="Upload .nii or .nii.gz" accept=".nii,.gz" onFile={loadMRI}/><UploadBox title="TRACTOGRAPHY" sub="Upload streamline JSON" accept=".json" onFile={loadTracts}/><div className="mt-2 rounded-xl border border-white/8 bg-white/[.02] p-3"><div className="font-mono text-[6px] text-white/25">CURRENT VOLUME</div><div className="mt-1 truncate text-[10px] text-white/65">{dataset}</div><div className="mt-2 font-mono text-[6px] text-white/25">NATIVE DIMENSIONS</div><div className="mt-1 text-[10px] text-cyan-100/65">{dims.join(" × ")} vox</div><div className="mt-2 font-mono text-[6px] text-white/25">STATUS</div><div className="mt-1 text-[9px] text-cyan-200/55">{status}</div></div></Panel>
        <Panel title="REGION OF INTEREST"><div className="space-y-1">{ROIS.map((r,i)=><button key={r} onClick={()=>{setRoi(r);notify(`${r} selected`)}} className={`w-full rounded-lg border px-3 py-2 text-left text-[9px] ${roi===r?"border-cyan-300/35 bg-cyan-300/[.07] text-cyan-100":"border-white/7 text-white/40 hover:text-white/75"}`}><span className="mr-2 font-mono text-[6px] text-white/20">0{i+1}</span>{r}</button>)}</div></Panel>
        <Panel title="WORKSPACE"><button onClick={()=>setAnalysis(true)} className="w-full rounded-lg border border-cyan-200/15 bg-cyan-200/[.03] px-3 py-3 text-left font-mono text-[7px] tracking-[.16em] text-cyan-100/65 hover:border-cyan-200/35">OPEN LIVE ANALYSIS ↗</button><button onClick={reset} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-white/7 px-3 py-3 font-mono text-[7px] tracking-[.16em] text-white/35 hover:text-white/70"><RotateCcw size={11}/> RESET REFERENCE DATASET</button></Panel>
      </aside>
      <main className="overflow-hidden rounded-2xl border border-white/10 bg-[#05080a]"><div className="flex items-center justify-between border-b border-white/8 px-4 py-3"><div className="font-mono text-[7px] tracking-[.2em] text-white/30">3D VOLUME / {dataset.slice(0,26)}</div><div className="font-mono text-[7px] tracking-[.16em] text-cyan-200/55">{modeInfo[1].toUpperCase()}</div></div><div className="relative min-h-[620px] overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(42,190,220,.075),transparent_34%),linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]"><div className="absolute inset-0"><VolumeBrain volume={volume} mode={mode}/></div>{mode==="TRACTS"&&<div className="absolute inset-0"><FiberField tracks={tracks}/></div>}{mode==="EEG"&&<div className="absolute bottom-4 left-1/2 h-32 w-[70%] -translate-x-1/2 rounded-xl border border-emerald-200/10 bg-black/50 p-2"><EEGField/></div>}<div className="pointer-events-none absolute left-4 top-4 font-mono text-[6px] leading-4 text-white/30">AXIAL / T1W<br/>R → L<br/>A → P<br/>ROI / {roi.toUpperCase()}</div><div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/8 bg-black/40 px-3 py-2 font-mono text-[6px] text-white/30">DRAG TO ROTATE · SCROLL TO ZOOM · LOCAL VOXEL RENDER</div><div className="absolute right-4 top-4 rounded-lg border border-cyan-200/10 bg-black/35 px-3 py-2 font-mono text-[6px] text-cyan-100/45">{status}<br/>{dims.join("×")} VOXELS</div></div><div className="grid grid-cols-5 border-t border-white/8">{MODES.map(([id,title,sub,Icon])=><button key={id} onClick={()=>setMode(id)} className={`min-h-[74px] border-r border-white/7 px-2 py-3 text-left ${mode===id?"bg-cyan-300/[.06]":"hover:bg-white/[.025]"}`}><Icon size={14} className={mode===id?"text-cyan-200":"text-white/25"}/><div className={`mt-2 font-mono text-[6px] tracking-[.12em] ${mode===id?"text-cyan-100/80":"text-white/35"}`}>{title.toUpperCase()}</div><div className="mt-1 hidden text-[7px] text-white/20 md:block">{sub}</div></button>)}</div></main>
      <aside className="space-y-3"><Panel title="ANALYSIS"><button onClick={()=>setAnalysis(true)} className="flex w-full items-center justify-between rounded-xl border border-cyan-200/15 bg-cyan-200/[.03] p-4 text-left hover:border-cyan-200/35"><div><div className="font-mono text-[7px] tracking-[.18em] text-cyan-100/65">LIVE ANALYSIS</div><div className="mt-1 text-xs text-white/55">Open computed findings</div></div><Maximize2 size={13} className="text-cyan-200/45"/></button></Panel><Panel title="VOLUME METRICS"><Metric title="VOXELS" value={stats.VOXELS||"—"} sub="native source"/><Metric title="INTENSITY" value={`${stats.MIN||"—"} → ${stats.MAX||"—"}`} sub={`mean ${stats.MEAN||"—"}`}/></Panel><Panel title="ACTIONS"><button onClick={exportPNG} className="flex w-full items-center gap-2 rounded-lg border border-white/7 px-3 py-3 font-mono text-[7px] tracking-[.15em] text-white/40 hover:text-white/80"><Download size={11}/> EXPORT VIEW</button><button onClick={()=>notify(`ROI analysis queued for ${roi}`)} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-white/7 px-3 py-3 font-mono text-[7px] tracking-[.15em] text-white/40 hover:text-white/80"><ScanSearch size={11}/> ANALYZE {roi.toUpperCase()}</button></Panel><Panel title="SYSTEM"><div className="space-y-2 font-mono text-[7px] text-white/30"><div className="flex justify-between"><span>PROCESSING</span><span className="text-cyan-200/55">LOCAL</span></div><div className="flex justify-between"><span>VOLUME ENGINE</span><span className="text-cyan-200/55">3D</span></div><div className="flex justify-between"><span>NIFTI SUPPORT</span><span className="text-cyan-200/55">.NII</span></div></div></Panel></aside>
    </div></div>{toast&&<div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-cyan-200/20 bg-[#071014]/95 px-5 py-3 font-mono text-[7px] tracking-[.16em] text-cyan-100/75 shadow-xl">{toast}</div>}{analysis&&<AnalysisWindow volume={volume} dims={dims} stats={stats} tracks={tracks} onClose={()=>setAnalysis(false)}/>}</div>;
}
function UploadBox({title,sub,accept,onFile}:{title:string;sub:string;accept:string;onFile:(f:File)=>void}){return <label className="mb-2 block cursor-pointer rounded-xl border border-white/8 bg-white/[.018] p-4 transition hover:border-cyan-200/30 hover:bg-cyan-200/[.025]"><div className="flex items-center gap-2"><Upload size={12} className="text-cyan-200/55"/><div className="font-mono text-[7px] tracking-[.18em] text-white/50">{title}</div></div><div className="mt-2 text-[9px] text-white/25">{sub}</div><input className="hidden" type="file" accept={accept} onChange={e=>e.target.files?.[0]&&onFile(e.target.files[0])}/></label>}
function Panel({title,children}:{title:string;children:any}){return <section className="rounded-xl border border-white/8 bg-white/[.012] p-3"><div className="mb-3 font-mono text-[7px] tracking-[.22em] text-white/25">{title}</div>{children}</section>}
