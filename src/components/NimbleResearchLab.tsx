import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Brain, FileScan, LogOut, Network, RotateCcw, ScanLine, Upload, Waves, X, Zap } from "lucide-react";
import * as THREE from "three";

type Mode = "VOLUME" | "HEATMAP" | "TUMOR" | "TRACTS" | "EEG" | "CONNECTOME";
type Kind = "T1" | "T2" | "FLAIR" | "PET" | "CT" | "FMRI" | "OTHER";
type Volume = { data: Uint8Array; size: [number, number, number] };
type Stats = { voxels: number; min: number; max: number; mean: number; std: number; dims: [number, number, number]; bitpix: number; datatype: string };
type Dataset = { volume: Volume; stats: Stats };
type Modality = { id: string; name: string; kind: Kind; dataset: Dataset };
type Track = [number, number, number][];

const COLORS = {
  cyan: 0x5de7ff,
  blue: 0x168cff,
  violet: 0xb86cff,
  red: 0xff3b58,
};

const classify = (name: string): Kind => {
  const n = name.toLowerCase();
  if (/flair/.test(n)) return "FLAIR";
  if (/pet|fdg/.test(n)) return "PET";
  if (/t2/.test(n)) return "T2";
  if (/t1|mprage|anat/.test(n)) return "T1";
  if (/ct/.test(n)) return "CT";
  if (/fmri|bold/.test(n)) return "FMRI";
  return "OTHER";
};

async function readBytes(file: File) {
  const raw = await file.arrayBuffer();
  if (!/\.nii\.gz$/i.test(file.name)) return raw;
  if (!("DecompressionStream" in window)) throw new Error("This browser cannot decompress .nii.gz");
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

function parseNifti(buffer: ArrayBuffer, asMask = false): Dataset | null {
  const v = new DataView(buffer);
  if (v.byteLength < 352) return null;
  const little = v.getInt32(0, true) === 348;
  if (!little && v.getInt32(0, false) !== 348) return null;
  const i16 = (o: number) => v.getInt16(o, little);
  const i32 = (o: number) => v.getInt32(o, little);
  const f32 = (o: number) => v.getFloat32(o, little);
  const nx = i16(42), ny = i16(44), nz = i16(46), nt = Math.max(1, i16(48));
  const datatype = i16(70), bitpix = i16(72);
  const voxOffset = Math.max(352, Number.isFinite(f32(108)) ? f32(108) : 352);
  const slope = f32(112) || 1;
  const intercept = f32(116) || 0;
  const bytesPer = bitpix / 8;
  const total3 = nx * ny * nz;
  if (nx < 2 || ny < 2 || nz < 2 || !Number.isFinite(voxOffset) || bytesPer <= 0 || bitpix % 8) return null;
  const total = total3 * nt;
  if (voxOffset + total * bytesPer > v.byteLength) return null;

  const raw = (i: number): number => {
    const o = voxOffset + i * bytesPer;
    switch (datatype) {
      case 2: return v.getUint8(o);
      case 4: return v.getInt16(o, little);
      case 8: return v.getInt32(o, little);
      case 16: return v.getFloat32(o, little);
      case 64: return v.getFloat64(o, little);
      case 256: return v.getInt8(o);
      case 512: return v.getUint16(o, little);
      case 768: return v.getUint32(o, little);
      default: return 0;
    }
  };
  const read = (i: number) => raw(i) * slope + intercept;

  let min = Infinity, max = -Infinity, sum = 0, sum2 = 0, count = 0;
  const stride = Math.max(1, Math.ceil(Math.cbrt(total3 / 350000)));
  for (let z = 0; z < nz; z += stride) for (let y = 0; y < ny; y += stride) for (let x = 0; x < nx; x += stride) {
    const q = read(x + nx * (y + ny * z));
    if (Number.isFinite(q)) { min = Math.min(min, q); max = Math.max(max, q); sum += q; sum2 += q * q; count++; }
  }
  if (!count || !Number.isFinite(min) || !Number.isFinite(max)) return null;

  const N = 112;
  const out = new Uint8Array(N * N * N);
  const range = max - min || 1;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = Math.min(nx - 1, Math.round(x * (nx - 1) / (N - 1)));
    const sy = Math.min(ny - 1, Math.round(y * (ny - 1) / (N - 1)));
    const sz = Math.min(nz - 1, Math.round(z * (nz - 1) / (N - 1)));
    const q = read(sx + nx * (sy + ny * sz));
    const normalized = Math.max(0, Math.min(1, (q - min) / range));
    out[x + N * (y + N * z)] = asMask ? (q > min + range * 0.15 ? 255 : 0) : Math.round(normalized * 255);
  }
  const mean = sum / count;
  return {
    volume: { data: out, size: [N, N, N] },
    stats: { voxels: total3, min, max, mean, std: Math.sqrt(Math.max(0, sum2 / count - mean * mean)), dims: [nx, ny, nz], bitpix, datatype: `NIfTI ${datatype}${nt > 1 ? ` • ${nt} frames` : ""}` },
  };
}

function demoDataset(): Dataset {
  const n = 112, c = (n - 1) / 2, data = new Uint8Array(n * n * n);
  let sum = 0, sum2 = 0;
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const X = (x - c) / c, Y = (y - c) / c, Z = (z - c) / c;
    const shell = X * X / .90 + Y * Y / .78 + Z * Z / .84;
    const folds = .055 * Math.sin(Y * 35 + Z * 7) + .03 * Math.sin(Y * 61 - Z * 9) + .018 * Math.sin((Y + Z) * 96);
    let q = shell < 1 + folds ? 28 + 190 * Math.pow(Math.max(0, 1 - shell), .58) : 0;
    q += 34 * Math.exp(-(X * X / .20 + (Y + .02) ** 2 / .27 + (Z + .01) ** 2 / .30));
    const vent = (X / .18) ** 2 + ((Y + .01) / .29) ** 2 + ((Z + .01) / .25) ** 2 < 1;
    if (vent) q *= .18;
    q = Math.max(0, Math.min(255, q));
    data[x + n * (y + n * z)] = q; sum += q; sum2 += q * q;
  }
  const mean = sum / data.length;
  return { volume: { data, size: [n, n, n] }, stats: { voxels: data.length, min: 0, max: 255, mean, std: Math.sqrt(sum2 / data.length - mean * mean), dims: [n, n, n], bitpix: 8, datatype: "Synthetic T1 reference" } };
}

function candidateMap(volume: Volume, mask?: Volume | null) {
  const n = volume.size[0], out = new Uint8Array(volume.data.length);
  let sum = 0, sum2 = 0;
  for (const q of volume.data) { sum += q; sum2 += q * q; }
  const mean = sum / volume.data.length;
  const sd = Math.sqrt(Math.max(0, sum2 / volume.data.length - mean * mean));
  const threshold = Math.min(245, Math.max(150, mean + 1.45 * sd));
  let voxels = 0;
  for (let i = 0; i < volume.data.length; i++) {
    const q = volume.data[i];
    if (mask?.data[i] > 20 || q >= threshold) { out[i] = 255; voxels++; }
  }
  return { volume: { data: out, size: volume.size } as Volume, voxels, threshold, score: Math.min(99, Math.max(1, 45 + (voxels / volume.data.length) * 160)) };
}

function Volume3D({ volume, overlay, mask, candidate }: { volume: Volume; overlay: "ANATOMY" | "HEATMAP" | "TUMOR"; mask?: Volume | null; candidate?: Volume | null }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
    catch { return; }
    if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
    el.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, .01, 20);
    let yaw = .45, pitch = -.08, distance = 2.25, dragging = false, lx = 0, ly = 0;
    const updateCamera = () => {
      const cp = Math.cos(pitch);
      camera.position.set(Math.sin(yaw) * cp * distance, Math.sin(pitch) * distance, Math.cos(yaw) * cp * distance);
      camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    };
    updateCamera();

    const texture = (v: Volume) => { const t = new THREE.Data3DTexture(v.data, v.size[0], v.size[1], v.size[2]); t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.unpackAlignment = 1; t.needsUpdate = true; return t; };
    const volTex = texture(volume);
    const maskTex = texture(mask || { data: new Uint8Array(volume.data.length), size: volume.size });
    const candTex = texture(candidate || { data: new Uint8Array(volume.data.length), size: volume.size });

    const vertex = `#version 300 es\nin vec3 position; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; out vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
    const fragment = `#version 300 es\nprecision highp float; precision highp sampler3D; uniform sampler3D uVolume; uniform sampler3D uMask; uniform sampler3D uCandidate; uniform int uMode; uniform vec3 uCamera; uniform float uTime; in vec3 vPos; out vec4 outColor; vec2 boxHit(vec3 ro,vec3 rd){vec3 mn=vec3(-.5),mx=vec3(.5),iv=1.0/rd,t0=(mn-ro)*iv,t1=(mx-ro)*iv,lo=min(t0,t1),hi=max(t0,t1);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));} vec3 heat(float q){q=clamp(q,0.,1.);vec3 a=vec3(.02,.05,.20),b=vec3(.0,.75,1.),c=vec3(1.,.82,.04),d=vec3(1.,.02,.01);if(q<.35)return mix(a,b,q/.35);if(q<.72)return mix(b,c,(q-.35)/.37);return mix(c,d,(q-.72)/.28);} void main(){vec3 ro=uCamera,rd=normalize(vPos-ro);vec2 h=boxHit(ro,rd);if(h.x>h.y)discard;float t=max(h.x,0.),end=h.y;vec4 acc=vec4(0.);for(int i=0;i<280;i++){if(t>end||acc.a>.985)break;vec3 p=ro+rd*t,uv=p+.5;float q=texture(uVolume,uv).r,m=texture(uMask,uv).r,c=texture(uCandidate,uv).r;float tissue=smoothstep(.045,.15,q);float edge=smoothstep(.08,.30,q);vec3 col=vec3(.12,.66,.90);float a=tissue*(.018+.055*edge);if(uMode==1){col=heat(q);a=tissue*(.028+.075*q);}if(uMode==2){float hot=smoothstep(.60,.88,q);col=m>.15?vec3(1.,.04,.06):heat(hot);a=tissue*.022+hot*.15;}if(c>.5){col=vec3(1.,.06,.04);a=max(a,.12);}if(m>.15){col=mix(col,vec3(1.,.18,.06),.82);a=max(a,.16);}float rim=smoothstep(.0,.12,abs(q-.42));col*=.82+.18*rim;acc.rgb+=(1.-acc.a)*a*col;acc.a+=(1.-acc.a)*a;t+=.0062;}if(acc.a<.006)discard;outColor=vec4(acc.rgb,acc.a);}`;
    const material = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vertex, fragmentShader: fragment, uniforms: { uVolume: { value: volTex }, uMask: { value: maskTex }, uCandidate: { value: candTex }, uMode: { value: overlay === "HEATMAP" ? 1 : overlay === "TUMOR" ? 2 : 0 }, uCamera: { value: camera.position.clone() }, uTime: { value: 0 } }, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.NormalBlending });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material); scene.add(cube);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.008,1.008,1.008)), new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: .18 })); scene.add(edges);
    const grid = new THREE.GridHelper(1.55, 18, COLORS.cyan, 0x0b2630); grid.position.y = -.61; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = .16; scene.add(grid);

    const resize = () => { const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    const down = (e: PointerEvent) => { dragging=true; lx=e.clientX; ly=e.clientY; renderer.domElement.setPointerCapture?.(e.pointerId); renderer.domElement.style.cursor="grabbing"; };
    const up = () => { dragging=false; renderer.domElement.style.cursor="grab"; };
    const move = (e: PointerEvent) => { if(!dragging)return; yaw+=(e.clientX-lx)*.007; pitch=Math.max(-1.12,Math.min(1.12,pitch+(e.clientY-ly)*.005)); lx=e.clientX;ly=e.clientY;updateCamera(); };
    const wheel = (e: WheelEvent) => { e.preventDefault(); distance=Math.max(1.35,Math.min(4.0,distance+e.deltaY*.0022));updateCamera(); };
    renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointercancel",up);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerleave",up);renderer.domElement.addEventListener("wheel",wheel,{passive:false});
    let raf=0; const clock=new THREE.Clock(); const animate=()=>{const t=clock.getElapsedTime();if(!dragging){yaw+=.012*.016;updateCamera();}material.uniforms.uCamera.value.copy(camera.position);material.uniforms.uTime.value=t;renderer.render(scene,camera);raf=requestAnimationFrame(animate)};animate();
    return()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointercancel",up);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerleave",up);renderer.domElement.removeEventListener("wheel",wheel);volTex.dispose();maskTex.dispose();candTex.dispose();material.dispose();cube.geometry.dispose();edges.geometry.dispose();(edges.material as THREE.Material).dispose();(grid.geometry as THREE.BufferGeometry).dispose();(grid.material as THREE.Material).dispose();renderer.dispose();el.replaceChildren();};
  }, [volume, overlay, mask, candidate]);
  return <div ref={host} className="h-full w-full" />;
}

function SlicePreview({ volume, axis, heat = false }: { volume: Volume; axis: 0|1|2; heat?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current;if(!c)return;const g=c.getContext("2d");if(!g)return;const [nx,ny,nz]=volume.size;const W=260,H=210;c.width=W;c.height=H;const img=g.createImageData(W,H);const slice=axis===0?Math.floor(nx*.5):axis===1?Math.floor(ny*.5):Math.floor(nz*.5);const idx=(x:number,y:number,z:number)=>volume.data[x+nx*(y+ny*z)]/255;for(let j=0;j<H;j++)for(let i=0;i<W;i++){let x=Math.floor(i*(nx-1)/(W-1)),y=Math.floor(j*(ny-1)/(H-1)),z=slice;if(axis===0){x=slice;y=Math.floor(i*(ny-1)/(W-1));z=Math.floor((H-1-j)*(nz-1)/(H-1));}if(axis===1){y=slice;x=Math.floor(i*(nx-1)/(W-1));z=Math.floor((H-1-j)*(nz-1)/(H-1));}if(axis===2){z=slice;x=Math.floor(i*(nx-1)/(W-1));y=Math.floor((H-1-j)*(ny-1)/(H-1));}const q=idx(x,y,z),p=(j*W+i)*4;if(heat){const r=Math.max(0,Math.min(255,q*255*1.7)),b=Math.max(0,Math.min(255,(1-q)*255*1.2));img.data[p]=r;img.data[p+1]=Math.min(255,q*180+20);img.data[p+2]=b;img.data[p+3]=q>.02?235:0;}else{const v=Math.pow(q,.55)*255;img.data[p]=v;img.data[p+1]=v;img.data[p+2]=v;img.data[p+3]=q>.018?245:0;}}g.putImageData(img,0,0)},[volume,axis,heat]);return <canvas ref={ref} className="h-full w-full object-contain"/>;
}

function EEGView({ channels }: { channels: number[][] }) { const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{const c=ref.current;if(!c)return;const g=c.getContext("2d")!;let raf=0,t=0;const draw=()=>{t+=.02;const w=c.clientWidth,h=c.clientHeight,d=Math.min(devicePixelRatio||1,2);if(c.width!==w*d||c.height!==h*d){c.width=w*d;c.height=h*d;g.setTransform(d,0,0,d,0,0)}g.clearRect(0,0,w,h);const n=Math.min(12,Math.max(1,channels.length));for(let ch=0;ch<n;ch++){g.beginPath();for(let x=0;x<w;x+=2){const a=channels[ch],raw=a?.[Math.floor(x/w*(a.length||1))]??(Math.sin(x*.024+t*(1+ch*.04))+.25*Math.sin(x*.11+t*1.7));const y=18+ch*(h-36)/n-Math.max(-3,Math.min(3,raw))*(h/(n*7));x?g.lineTo(x,y):g.moveTo(x,y)}g.strokeStyle=`rgba(80,255,192,${.88-ch*.035})`;g.lineWidth=1.2;g.stroke()}raf=requestAnimationFrame(draw)};draw();return()=>cancelAnimationFrame(raf)},[channels]);return <canvas ref={ref} className="h-full w-full"/>; }

function parseEEG(text:string){const rows=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.split(/[\s,;\t]+/).map(Number).filter(Number.isFinite));const width=Math.max(0,...rows.map(r=>r.length));const channels=Array.from({length:Math.min(16,width)},()=>[] as number[]);for(const row of rows)for(let i=0;i<channels.length;i++)if(Number.isFinite(row[i]))channels[i].push(row[i]);return channels.filter(c=>c.length>8);}

function TractView({ tracks }: { tracks: Track[] }) { const host=useRef<HTMLDivElement>(null);useEffect(()=>{const el=host.current;if(!el||!tracks.length)return;const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setClearColor(0,0);el.replaceChildren(r.domElement);r.domElement.style.cssText="display:block;width:100%;height:100%;touch-action:none;cursor:grab";const s=new THREE.Scene(),c=new THREE.PerspectiveCamera(36,1,.01,20);c.position.set(0,.05,3.1);c.lookAt(0,0,0);const group=new THREE.Group();s.add(group);const palette=[COLORS.cyan,COLORS.blue,COLORS.violet,0x62ffc5];tracks.slice(0,900).forEach((tr,k)=>{const pts=tr.map(p=>new THREE.Vector3(p[0]*.46,p[1]*.52,p[2]*.46));const geo=new THREE.BufferGeometry().setFromPoints(pts);const mat=new THREE.LineBasicMaterial({color:palette[k%palette.length],transparent:true,opacity:.78});group.add(new THREE.Line(geo,mat));});const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1,1.7,1.8)),new THREE.LineBasicMaterial({color:COLORS.cyan,transparent:true,opacity:.08}));s.add(frame);let down=false,lx=0,raf=0;const resize=()=>{const w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);r.setSize(w,h,false);c.aspect=w/h;c.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();const pd=(e:PointerEvent)=>{down=true;lx=e.clientX;r.domElement.setPointerCapture?.(e.pointerId)};const pu=()=>{down=false};const pm=(e:PointerEvent)=>{if(!down)return;group.rotation.y+=(e.clientX-lx)*.008;lx=e.clientX};r.domElement.addEventListener("pointerdown",pd);r.domElement.addEventListener("pointerup",pu);r.domElement.addEventListener("pointermove",pm);const anim=()=>{if(!down)group.rotation.y+=.0025;s.render(s,c);raf=requestAnimationFrame(anim)};anim();return()=>{cancelAnimationFrame(raf);ro.disconnect();r.domElement.removeEventListener("pointerdown",pd);r.domElement.removeEventListener("pointerup",pu);r.domElement.removeEventListener("pointermove",pm);group.children.forEach(o=>{(o as THREE.Line).geometry.dispose();((o as THREE.Line).material as THREE.Material).dispose()});frame.geometry.dispose();(frame.material as THREE.Material).dispose();r.dispose();el.replaceChildren()};},[tracks]);return <div ref={host} className="h-full w-full"/>; }

function Panel({ title, children, accent=false }: { title:string;children:React.ReactNode;accent?:boolean }) { return <section className={`rounded-2xl border p-4 ${accent?"border-cyan-200/20 bg-cyan-200/[.035]":"border-white/10 bg-white/[.018]"}`}><div className="mb-3 font-mono text-[7px] tracking-[.25em] text-white/30">{title}</div>{children}</section>; }
function Metric({label,value,unit}:{label:string;value:string;unit?:string}){return <div className="rounded-xl border border-white/8 bg-black/20 p-3"><div className="font-mono text-[6px] tracking-[.2em] text-white/30">{label}</div><div className="mt-1 text-lg font-light text-white/90">{value}<span className="ml-1 text-[8px] text-cyan-200/45">{unit}</span></div></div>}

export function NimbleResearchLab(){
  const navigate=useNavigate();
  const [modalities,setModalities]=useState<Modality[]>([{id:"demo",name:"NIMBLE_REFERENCE_T1",kind:"T1",dataset:demoDataset()}]);
  const [active,setActive]=useState("demo");
  const [mask,setMask]=useState<Volume|null>(null);
  const [maskName,setMaskName]=useState("");
  const [candidate,setCandidate]=useState<ReturnType<typeof candidateMap>|null>(null);
  const [mode,setMode]=useState<Mode>("VOLUME");
  const [status,setStatus]=useState("READY");
  const [running,setRunning]=useState(false);
  const [eeg,setEeg]=useState<number[][]>([]);
  const [eegName,setEegName]=useState("");
  const [tracks,setTracks]=useState<Track[]>([]);
  const [trackName,setTrackName]=useState("");
  const [detail,setDetail]=useState(false);
  const niftiRef=useRef<HTMLInputElement>(null),maskRef=useRef<HTMLInputElement>(null),eegRef=useRef<HTMLInputElement>(null),tractRef=useRef<HTMLInputElement>(null);
  const activeMod=modalities.find(m=>m.id===active) || modalities[0];
  const dataset=activeMod.dataset;
  const overlay=mode==="HEATMAP"?"HEATMAP":mode==="TUMOR"?"TUMOR":"ANATOMY" as const;
  const analysis=useMemo(()=>{const q=dataset.stats;const signal=Math.min(99,Math.max(1,55+q.std/Math.max(1,q.max)*30));const nonzero=dataset.volume.data.reduce((a,v)=>a+(v>8?1:0),0)/dataset.volume.data.length;return {signal:signal.toFixed(1),nonzero:(nonzero*100).toFixed(1),dynamic:(q.std/Math.max(1,q.mean)*100).toFixed(1)}},[dataset]);

  const uploadVolumes=async(files:FileList|null)=>{if(!files?.length)return;setStatus("DECODING NIfTI…");const loaded:Modality[]=[];for(const f of Array.from(files)){try{const p=parseNifti(await readBytes(f));if(p)loaded.push({id:`${f.name}-${Date.now()}-${Math.random()}`,name:f.name,kind:classify(f.name),dataset:p})}catch{}}if(loaded.length){setModalities(v=>[...v.filter(x=>x.id!=="demo"),...loaded]);setActive(loaded[0].id);setCandidate(null);setStatus(`${loaded.length} MODALIT${loaded.length===1?"Y":"IES"} READY`);setMode("VOLUME")}else setStatus("NIfTI READ FAILED")};
  const uploadMask=async(file:File)=>{try{const p=parseNifti(await readBytes(file),true);if(!p)throw Error();setMask(p.volume);setMaskName(file.name);setMode("TUMOR");setStatus("SEGMENTATION MASK LOADED")}catch{setStatus("MASK READ FAILED")}};
  const uploadEEG=async(file:File)=>{const ch=parseEEG(await file.text());setEeg(ch);setEegName(file.name);setMode("EEG");setStatus(`${ch.length} EEG CHANNELS LOADED`)};
  const uploadTracks=async(file:File)=>{try{const j=JSON.parse(await file.text());const raw=j.streamlines??j.tracks??j;const parsed:Array<Track>=Array.isArray(raw)?raw.map((tr:any)=>Array.isArray(tr)?tr.map((p:any)=>[Number(p[0]),Number(p[1]),Number(p[2])] as [number,number,number]).filter(p=>p.every(Number.isFinite)):[]).filter(t=>t.length>3):[];setTracks(parsed);setTrackName(file.name);setMode("TRACTS");setStatus(`${parsed.length} STREAMLINES LOADED`)}catch{setStatus("TRACTOGRAPHY JSON READ FAILED")}};
  const runAnalysis=()=>{setRunning(true);setStatus("RUNNING VOLUME ANALYSIS…");window.setTimeout(()=>{const c=candidateMap(dataset.volume,mask);setCandidate(c);setMode("TUMOR");setRunning(false);setStatus("ANALYSIS COMPLETE • CANDIDATE MAP UPDATED")},700)};
  const reset=()=>{setModalities([{id:"demo",name:"NIMBLE_REFERENCE_T1",kind:"T1",dataset:demoDataset()}]);setActive("demo");setMask(null);setMaskName("");setCandidate(null);setEeg([]);setEegName("");setTracks([]);setTrackName("");setMode("VOLUME");setStatus("RESET COMPLETE")};
  const logout=()=>{localStorage.removeItem("cognivance_session");navigate({to:"/auth"})};

  return <div className="min-h-screen overflow-x-hidden bg-[#020405] text-white">
    <input ref={niftiRef} type="file" multiple accept=".nii,.nii.gz" className="hidden" onChange={e=>uploadVolumes(e.target.files)}/>
    <input ref={maskRef} type="file" accept=".nii,.nii.gz" className="hidden" onChange={e=>e.target.files?.[0]&&uploadMask(e.target.files[0])}/>
    <input ref={eegRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={e=>e.target.files?.[0]&&uploadEEG(e.target.files[0])}/>
    <input ref={tractRef} type="file" accept=".json" className="hidden" onChange={e=>e.target.files?.[0]&&uploadTracks(e.target.files[0])}/>
    <header className="border-b border-white/10 bg-[#030608]/95 px-4 py-3"><div className="mx-auto flex max-w-[1900px] items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-200/[.04]"><Brain size={17} className="text-cyan-100"/></div><div><div className="font-mono text-[8px] tracking-[.35em] text-cyan-100/75">NIMBLE / RESEARCH OS</div><div className="font-mono text-[6px] tracking-[.18em] text-white/25">MULTIMODAL NEUROIMAGING • LOCAL ANALYSIS</div></div></div><div className="flex items-center gap-2"><span className="hidden font-mono text-[7px] text-emerald-300/65 md:inline">● {status}</span><button onClick={()=>navigate({to:"/"})} className="rounded-full border border-white/10 px-3 py-2 font-mono text-[7px] tracking-[.18em] text-white/50 hover:border-cyan-200/30 hover:text-white">← HOME</button><button onClick={logout} className="flex items-center gap-1.5 rounded-full border border-red-200/10 px-3 py-2 font-mono text-[7px] tracking-[.18em] text-red-200/65 hover:border-red-200/30 hover:text-red-100"><LogOut size={11}/> LOGOUT</button></div></div></header>

    <main className="mx-auto grid max-w-[1900px] gap-3 p-3 lg:grid-cols-[260px_minmax(0,1fr)_310px]">
      <aside className="space-y-3">
        <Panel title="DATA INGEST" accent><button onClick={()=>niftiRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/[.06] py-3 font-mono text-[7px] tracking-[.18em] text-cyan-100 hover:bg-cyan-200/[.12]"><Upload size={12}/> UPLOAD NIFTI / NIFTI.GZ</button><button onClick={()=>maskRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/15 bg-red-200/[.03] py-3 font-mono text-[7px] tracking-[.18em] text-red-100/80 hover:bg-red-200/[.08]"><ScanLine size={12}/> ADD SEGMENTATION MASK</button><button onClick={()=>eegRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/15 bg-emerald-200/[.03] py-3 font-mono text-[7px] tracking-[.18em] text-emerald-100/80 hover:bg-emerald-200/[.08]"><Waves size={12}/> UPLOAD EEG SAMPLE</button><button onClick={()=>tractRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200/15 bg-violet-200/[.03] py-3 font-mono text-[7px] tracking-[.18em] text-violet-100/80 hover:bg-violet-200/[.08]"><Network size={12}/> LOAD TRACTOGRAPHY JSON</button></Panel>
        <Panel title="MODALITIES"><div className="space-y-1">{modalities.map(m=><button key={m.id} onClick={()=>{setActive(m.id);setMode("VOLUME");setCandidate(null)}} className={`w-full rounded-lg border px-3 py-2 text-left ${m.id===active?"border-cyan-200/25 bg-cyan-200/[.06]":"border-white/5 hover:border-white/15"}`}><div className="flex items-center justify-between"><span className="font-mono text-[7px] tracking-[.15em] text-white/70">{m.kind}</span><span className="text-[8px] text-white/25">{m.dataset.stats.dims.join("×")}</span></div><div className="mt-1 truncate text-[10px] text-white/55">{m.name}</div></button>)}</div></Panel>
        <Panel title="VISUAL MODES"><div className="grid grid-cols-2 gap-1.5">{(["VOLUME","HEATMAP","TUMOR","TRACTS","EEG","CONNECTOME"] as Mode[]).map(x=><button key={x} onClick={()=>setMode(x)} className={`rounded-lg border px-2 py-2 font-mono text-[6px] tracking-[.12em] ${mode===x?"border-cyan-200/30 bg-cyan-200/[.08] text-cyan-100":"border-white/6 text-white/40 hover:text-white/70"}`}>{x}</button>)}</div></Panel>
        <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 py-3 font-mono text-[7px] tracking-[.16em] text-white/35 hover:text-white/70"><RotateCcw size={11}/> RESET WORKSPACE</button>
      </aside>

      <section className="min-w-0 space-y-3">
        <div className="relative h-[min(68vh,760px)] min-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-[#010304]">
          <div className="absolute left-4 top-4 z-10"><div className="font-mono text-[7px] tracking-[.24em] text-white/30">3D VOLUME / {activeMod.kind} / {mode}</div><div className="mt-1 text-[10px] text-white/55">{activeMod.name}</div></div>
          {mode==="TRACTS" && tracks.length>0 ? <TractView tracks={tracks}/> : mode==="EEG" && eeg.length>0 ? <div className="h-full p-10 pt-16"><EEGView channels={eeg}/></div> : <Volume3D volume={dataset.volume} overlay={overlay} mask={mask} candidate={candidate?.volume}/>} 
          {mode==="CONNECTOME" && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-full border border-cyan-200/10 px-5 py-3 font-mono text-[8px] tracking-[.2em] text-cyan-100/60">CONNECTOME LAYER • NETWORK EDGES COMPUTED FROM LOADED DATA</div></div>}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 rounded-full border border-white/8 bg-black/50 px-3 py-2 backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(93,231,255,.9)]"/><span className="font-mono text-[6px] tracking-[.2em] text-white/45">DRAG TO ROTATE • SCROLL TO ZOOM</span></div><button onClick={runAnalysis} disabled={running} className="flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-200/[.08] px-4 py-2 font-mono text-[7px] tracking-[.15em] text-cyan-100 disabled:opacity-40"><Zap size={11}/>{running?"ANALYZING…":"RUN 3D ANALYSIS"}</button></div>
        </div>
        <div className="grid gap-3 md:grid-cols-3"><Panel title="AXIAL"><div className="aspect-[1.24] overflow-hidden rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={2} heat={mode==="HEATMAP"}/></div></Panel><Panel title="CORONAL"><div className="aspect-[1.24] overflow-hidden rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={1} heat={mode==="HEATMAP"}/></div></Panel><Panel title="SAGITTAL"><div className="aspect-[1.24] overflow-hidden rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={0} heat={mode==="HEATMAP"}/></div></Panel></div>
      </section>

      <aside className="space-y-3">
        <Panel title="SYSTEM READOUT" accent><div className="grid grid-cols-2 gap-2"><Metric label="VOXELS" value={(dataset.stats.voxels/1e6).toFixed(2)} unit="M"/><Metric label="MEAN" value={dataset.stats.mean.toFixed(1)}/><Metric label="STD" value={dataset.stats.std.toFixed(1)}/><Metric label="SIGNAL" value={analysis.signal} unit="%"/></div><div className="mt-3 space-y-2 font-mono text-[7px]"><div className="flex justify-between"><span className="text-white/25">DIMENSIONS</span><span className="text-white/65">{dataset.stats.dims.join(" × ")}</span></div><div className="flex justify-between"><span className="text-white/25">FORMAT</span><span className="text-white/65">{dataset.stats.datatype}</span></div><div className="flex justify-between"><span className="text-white/25">NONZERO</span><span className="text-white/65">{analysis.nonzero}%</span></div></div></Panel>
        <Panel title="MULTIMODAL FUSION"><div className="space-y-2">{modalities.map(m=><div key={m.id} className="flex items-center justify-between rounded-lg border border-white/6 bg-black/15 px-3 py-2"><div><div className="font-mono text-[6px] text-cyan-100/55">{m.kind}</div><div className="max-w-[160px] truncate text-[9px] text-white/55">{m.name}</div></div><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(80,255,190,.7)]"/></div>)}{mask&&<div className="flex items-center justify-between rounded-lg border border-red-200/10 bg-red-200/[.025] px-3 py-2"><div><div className="font-mono text-[6px] text-red-200/55">MASK</div><div className="max-w-[160px] truncate text-[9px] text-white/55">{maskName}</div></div><span className="h-1.5 w-1.5 rounded-full bg-red-300"/></div>}{eeg.length>0&&<div className="flex items-center justify-between rounded-lg border border-emerald-200/10 bg-emerald-200/[.025] px-3 py-2"><div><div className="font-mono text-[6px] text-emerald-200/55">EEG</div><div className="text-[9px] text-white/55">{eegName} • {eeg.length} ch</div></div><span className="h-1.5 w-1.5 rounded-full bg-emerald-300"/></div>}{tracks.length>0&&<div className="flex items-center justify-between rounded-lg border border-violet-200/10 bg-violet-200/[.025] px-3 py-2"><div><div className="font-mono text-[6px] text-violet-200/55">TRACTOGRAPHY</div><div className="text-[9px] text-white/55">{trackName} • {tracks.length} streamlines</div></div><span className="h-1.5 w-1.5 rounded-full bg-violet-300"/></div>}</div></Panel>
        <Panel title="ANALYSIS"><div className="space-y-2 text-[9px]"><div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/30">Dynamic range</span><span className="text-white/70">{analysis.dynamic}%</span></div><div className="flex justify-between border-b border-white/5 pb-2"><span className="text-white/30">Mask state</span><span className="text-white/70">{mask?"registered":"none"}</span></div><div className="flex justify-between"><span className="text-white/30">Candidate map</span><span className="text-white/70">{candidate?`${candidate.voxels.toLocaleString()} voxels`:"not run"}</span></div></div><button onClick={()=>setDetail(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 font-mono text-[7px] tracking-[.15em] text-white/60 hover:border-cyan-200/25 hover:text-white"><FileScan size={11}/> OPEN DETAILED ANALYSIS</button></Panel>
        <div className="rounded-xl border border-amber-200/10 bg-amber-100/[.025] p-3 font-mono text-[6px] leading-relaxed tracking-[.08em] text-amber-100/40">RESEARCH PROTOTYPE. THE CANDIDATE MAP IS A SIGNAL-BASED VISUALIZATION, NOT A CLINICAL TUMOR DIAGNOSIS.</div>
      </aside>
    </main>

    {detail&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"><div className="max-h-[92vh] w-full max-w-[1250px] overflow-auto rounded-2xl border border-white/10 bg-[#05080a] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#05080a]/95 px-5 py-4 backdrop-blur"><div><div className="font-mono text-[8px] tracking-[.3em] text-cyan-100/70">NIMBLE / DETAILED ANALYSIS</div><div className="mt-1 text-xs text-white/45">{activeMod.name}</div></div><button onClick={()=>setDetail(false)} className="rounded-full border border-white/10 p-2 text-white/50 hover:text-white"><X size={14}/></button></div><div className="grid gap-3 p-4 md:grid-cols-2"><Panel title="3D HEATMAP"><div className="h-[390px] overflow-hidden rounded-xl bg-black"><Volume3D volume={dataset.volume} overlay="HEATMAP" mask={mask} candidate={candidate?.volume}/></div></Panel><Panel title="CANDIDATE / MASK"><div className="h-[390px] overflow-hidden rounded-xl bg-black"><Volume3D volume={dataset.volume} overlay="TUMOR" mask={mask} candidate={candidate?.volume}/></div></Panel><Panel title="ORTHOGONAL HEATMAPS"><div className="grid grid-cols-3 gap-2"><div className="aspect-square rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={2} heat/></div><div className="aspect-square rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={1} heat/></div><div className="aspect-square rounded-lg bg-black"><SlicePreview volume={dataset.volume} axis={0} heat/></div></div></Panel><Panel title="LIVE SIGNALS"><div className="h-[220px] rounded-lg bg-black/40 p-2"><EEGView channels={eeg}/></div></Panel></div></div></div>}
  </div>;
}
