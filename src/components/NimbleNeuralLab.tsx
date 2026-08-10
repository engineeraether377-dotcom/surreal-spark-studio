import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAVIGATION";

const MODEL_URL = "/NimbleBrain.glb";

const MODES: { id: Mode; label: string; kicker: string; copy: string }[] = [
  { id: "ANATOMY", label: "ANATOMICAL MAP", kicker: "STRUCTURE", copy: "High-fidelity anatomical substrate for the NIMBLE visualization stack." },
  { id: "CIRCUIT", label: "CIRCUIT RECONSTRUCTION", kicker: "TOPOLOGY", copy: "A visualization layer tracing candidate pathways across the anatomical surface." },
  { id: "SIGNAL", label: "SIGNAL PROPAGATION", kicker: "DYNAMICS", copy: "Animated propagation pulses visualize a reconstructed network over time." },
  { id: "NAVIGATION", label: "NANOROBOT NAVIGATION", kicker: "TRAJECTORY", copy: "A spatial simulation layer for future navigation experiments inside neural tissue." },
];

function patchSpecGlossGLB(input: ArrayBuffer): ArrayBuffer {
  const view = new DataView(input);
  if (view.byteLength < 20 || new TextDecoder().decode(new Uint8Array(input, 0, 4)) !== "glTF") throw new Error("Invalid GLB header");
  const jsonLength = view.getUint32(12, true);
  const jsonBytes = new Uint8Array(input, 20, jsonLength);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes));
  const used = json.extensionsUsed ?? [];
  if (!used.includes("KHR_materials_pbrSpecularGlossiness")) return input;

  for (const material of json.materials ?? []) {
    const ext = material.extensions?.KHR_materials_pbrSpecularGlossiness;
    if (!ext) continue;
    const diffuse = ext.diffuseFactor ?? [0.7, 0.7, 0.7, 1];
    const gloss = typeof ext.glossinessFactor === "number" ? ext.glossinessFactor : 0.5;
    material.pbrMetallicRoughness = {
      ...(material.pbrMetallicRoughness ?? {}),
      baseColorFactor: diffuse,
      metallicFactor: 0,
      roughnessFactor: Math.max(0.05, Math.min(1, 1 - gloss)),
    };
    delete material.extensions.KHR_materials_pbrSpecularGlossiness;
    if (Object.keys(material.extensions).length === 0) delete material.extensions;
  }

  json.extensionsUsed = used.filter((name: string) => name !== "KHR_materials_pbrSpecularGlossiness");
  if (Array.isArray(json.extensionsRequired)) {
    json.extensionsRequired = json.extensionsRequired.filter((name: string) => name !== "KHR_materials_pbrSpecularGlossiness");
    if (!json.extensionsRequired.length) delete json.extensionsRequired;
  }
  if (!json.extensionsUsed.length) delete json.extensionsUsed;

  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const paddedLength = Math.ceil(encoded.length / 4) * 4;
  const output = new ArrayBuffer(12 + 8 + paddedLength + (input.byteLength - (12 + 8 + jsonLength)));
  const out = new Uint8Array(output);
  const outView = new DataView(output);
  out.set(new Uint8Array(input, 0, 12), 0);
  outView.setUint32(8, output.byteLength, true);
  outView.setUint32(12, paddedLength, true);
  outView.setUint32(16, 0x4e4f534a, true);
  out.set(encoded, 20);
  out.set(new Uint8Array(input, 20 + jsonLength), 20 + paddedLength);
  return output;
}

function loadBrain(onLoad: (scene: THREE.Group) => void, onError: (error: Error) => void, onProgress: (value: number) => void) {
  const loader = new GLTFLoader();
  const controller = new AbortController();
  fetch(MODEL_URL, { signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${MODEL_URL}`);
      const total = Number(response.headers.get("content-length") || 0);
      const reader = response.body?.getReader();
      if (!reader) return response.arrayBuffer();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (total) onProgress((received / total) * 100);
        }
      }
      const buffer = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
      return buffer.buffer;
    })
    .then((buffer) => patchSpecGlossGLB(buffer))
    .then((buffer) => loader.parse(buffer, "/", (gltf) => onLoad(gltf.scene), undefined, (error) => onError(error instanceof Error ? error : new Error(String(error)))))
    .catch((error) => { if (error?.name !== "AbortError") onError(error instanceof Error ? error : new Error(String(error))); });
  return () => controller.abort();
}

function BrainModel({ mode, onStatus }: { mode: Mode; onStatus: (status: "loading" | "ready" | "error", detail?: string, progress?: number) => void }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    onStatus("loading", "Fetching anatomical specimen", 0);
    return loadBrain((loaded) => {
      loaded.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(loaded);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.8 / Math.max(size.x, size.y, size.z, 0.001);
      loaded.position.sub(center);
      loaded.scale.setScalar(scale);
      loaded.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const old = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const color = old && "color" in old ? (old as THREE.MeshStandardMaterial).color.clone() : new THREE.Color("#8a9a94");
        color.lerp(new THREE.Color("#8fa9a4"), 0.25);
        mesh.material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, metalness: 0.03, clearcoat: 0.18, clearcoatRoughness: 0.5, emissive: new THREE.Color("#06252a"), emissiveIntensity: 0.16 });
      });
      setScene(loaded);
      onStatus("ready", "Specimen normalized and decoded", 100);
    }, (error) => onStatus("error", error.message), (progress) => onStatus("loading", "Downloading anatomical specimen", progress));
  }, [onStatus]);
  if (!scene) return null;
  return <group><primitive object={scene} />{mode === "CIRCUIT" && <CircuitLayer />}{mode === "SIGNAL" && <SignalLayer />}{mode === "NAVIGATION" && <NavigationLayer />}</group>;
}

function CircuitLayer() {
  const points = useMemo(() => Array.from({ length: 34 }, (_, i) => { const a = i / 34 * Math.PI * 2; const r = 0.72 + (i % 6) * 0.045; return new THREE.Vector3(Math.cos(a) * r * 1.2, Math.sin(a * 1.8) * 0.42, Math.sin(a) * r); }), []);
  return <group>{points.slice(0, -1).map((point, i) => <line key={i}><bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([point, points[i + 1]])} /><lineBasicMaterial color={i % 4 === 0 ? "#b28cff" : "#54e7ff"} transparent opacity={0.55} depthWrite={false} /></line>)}{points.map((point, i) => <mesh key={`n-${i}`} position={point}><sphereGeometry args={[i % 4 === 0 ? 0.025 : 0.014, 10, 10]} /><meshBasicMaterial color={i % 4 === 0 ? "#c6a8ff" : "#67edff"} /></mesh>)}</group>;
}

function SignalLayer() {
  const points = useMemo(() => Array.from({ length: 46 }, (_, i) => new THREE.Vector3(Math.sin(i * 2.13) * 0.9, Math.cos(i * 1.37) * 0.48, Math.sin(i * 0.91) * 0.78)), []);
  return <group>{points.slice(0, -1).map((point, i) => <SignalPath key={i} start={point} end={points[i + 1]} phase={i * 0.19} />)}</group>;
}

function SignalPath({ start, end, phase }: { start: THREE.Vector3; end: THREE.Vector3; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => { if (ref.current) { const pulse = (Math.sin(state.clock.elapsedTime * 3.2 + phase) + 1) / 2; ref.current.scale.setScalar(0.65 + pulse * 0.65); } });
  return <><line><bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([start, end])} /><lineBasicMaterial color="#7d6cff" transparent opacity={0.25} depthWrite={false} /></line><mesh ref={ref} position={start.clone().lerp(end, 0.5)}><sphereGeometry args={[0.018, 10, 10]} /><meshBasicMaterial color="#d4c6ff" /></mesh></>;
}

function NavigationLayer() { return <group>{Array.from({ length: 30 }, (_, i) => <Agent key={i} index={i} />)}</group>; }
function Agent({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const base = useMemo(() => new THREE.Vector3(Math.sin(index * 1.77) * 0.95, Math.cos(index * 1.23) * 0.48, Math.sin(index * 0.71) * 0.78), [index]);
  useFrame((state) => { if (!ref.current) return; const t = state.clock.elapsedTime * 0.28 + index * 0.41; ref.current.position.set(base.x + Math.sin(t) * 0.11, base.y + Math.sin(t * 1.3) * 0.07, base.z + Math.cos(t * 0.8) * 0.1); });
  return <mesh ref={ref} position={base}><sphereGeometry args={[0.017, 8, 8]} /><meshBasicMaterial color="#5eeaff" /></mesh>;
}

function Scene({ mode, onStatus }: { mode: Mode; onStatus: (status: "loading" | "ready" | "error", detail?: string, progress?: number) => void }) {
  return <><color attach="background" args={["#020607"]} /><fog attach="fog" args={["#020607", 4.8, 9]} /><PerspectiveCamera makeDefault position={[0, 0, 4.4]} fov={32} /><ambientLight intensity={1.25} /><directionalLight position={[3, 4, 5]} intensity={3.0} color="#eefcff" /><pointLight position={[-2.5, 1.8, 2.5]} intensity={10} distance={6} color="#19cfff" /><pointLight position={[2.4, -1.4, 1.8]} intensity={7} distance={5} color="#7955ff" /><BrainModel mode={mode} onStatus={onStatus} /><OrbitControls enablePan={false} enableDamping dampingFactor={0.06} minDistance={2.3} maxDistance={7.5} autoRotate autoRotateSpeed={0.16} /></>;
}

export function NimbleNeuralLab() {
  const [active, setActive] = useState<Mode>("CIRCUIT");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [detail, setDetail] = useState("Initializing");
  const [progress, setProgress] = useState(0);
  const updateStatus = (next: "loading" | "ready" | "error", message?: string, value?: number) => { setStatus(next); if (message) setDetail(message); if (typeof value === "number") setProgress(value); };
  const selected = MODES.find((m) => m.id === active)!;
  return <section className="relative overflow-hidden bg-[#020404] text-white"><div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 50% 35%, rgba(80,225,255,.25), transparent 34%), linear-gradient(rgba(100,220,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(100,220,255,.35) 1px, transparent 1px)", backgroundSize: "100% 100%, 72px 72px, 72px 72px" }} /><div className="relative mx-auto max-w-[1540px] px-[clamp(1.25rem,4vw,4rem)] py-[clamp(5rem,9vw,8rem)]"><div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-4xl"><div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.35em] text-cyan-200/55"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" />NIMBLE / COGNIVANCE LABS<span className="h-px w-10 bg-cyan-200/15" />RESEARCH INSTRUMENT</div><h2 className="mt-7 text-[clamp(3.2rem,7.5vw,8rem)] font-medium leading-[0.82] tracking-[-0.07em]">Interrogate<br /><span className="bg-gradient-to-r from-white via-white to-cyan-100/35 bg-clip-text text-transparent">the living circuit.</span></h2><p className="mt-7 max-w-2xl text-sm leading-7 text-white/32">A cinematic interface for exploring anatomical structure and visualizing the research layers NIMBLE is designed to investigate.</p></div><div className="hidden max-w-[260px] pb-1 text-right lg:block"><p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/20">Specimen</p><p className="mt-2 text-[11px] text-white/45">Human brain / NIH 3D anatomical model</p><p className="mt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-300/40">Interactive visualization</p></div></div><div className="mt-12 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl">{MODES.map((item) => <button key={item.id} onClick={() => setActive(item.id)} className={`group relative shrink-0 rounded-xl px-4 py-3 text-left transition-all ${active === item.id ? "bg-cyan-300/[0.08] ring-1 ring-cyan-300/20" : "hover:bg-white/[0.035]"}`}><span className={`block font-mono text-[7px] uppercase tracking-[0.2em] ${active === item.id ? "text-cyan-200/75" : "text-white/25"}`}>{item.kicker}</span><span className={`mt-1 block text-[9px] uppercase tracking-[0.08em] ${active === item.id ? "text-white/80" : "text-white/35"}`}>{item.label}</span></button>)}</div><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><div className="relative h-[min(72vh,760px)] min-h-[560px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#030708] shadow-[0_30px_120px_rgba(0,0,0,.55)]"><Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }} camera={{ position: [0, 0, 4.4], fov: 32 }}><Scene mode={active} onStatus={updateStatus} /></Canvas><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_20%,rgba(0,0,0,.62)_100%)]" /><div className="pointer-events-none absolute left-6 top-6 font-mono text-[7px] uppercase tracking-[0.22em] text-cyan-200/40">NIMBLE / VISUALIZATION CORE</div><div className="pointer-events-none absolute bottom-6 left-6 right-6 flex items-end justify-between font-mono text-[7px] uppercase tracking-[0.18em] text-white/25"><span>DRAG TO ROTATE · SCROLL TO ZOOM</span><span>{selected.kicker}</span></div>{status !== "ready" && <div className="absolute inset-0 grid place-items-center bg-[#020506]/55 backdrop-blur-[2px]"><div className={`w-[310px] rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${status === "error" ? "border-red-300/20 bg-red-950/30" : "border-cyan-200/10 bg-[#05090a]/85"}`}><div className={`font-mono text-[8px] uppercase tracking-[0.22em] ${status === "error" ? "text-red-200/80" : "text-cyan-100/65"}`}>{status === "error" ? "MODEL LOAD ERROR" : "LOADING SPECIMEN"}</div><div className="mt-4 h-px overflow-hidden bg-white/10"><div className="h-full bg-cyan-300 transition-all duration-300" style={{ width: `${status === "error" ? 100 : progress}%` }} /></div><p className="mt-3 text-[10px] leading-5 text-white/45">{detail}</p><p className="mt-2 font-mono text-[7px] text-white/20">SOURCE · /NimbleBrain.glb · SPEC/GLOSS → METAL/ROUGH</p></div></div>}</div><aside className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl"><div className="flex items-center justify-between"><span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/25">Instrument state</span><span className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.18em] text-cyan-200/60"><span className={`h-1.5 w-1.5 rounded-full ${status === "ready" ? "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" : status === "error" ? "bg-red-300" : "bg-amber-200"}`} />{status}</span></div><div className="mt-8 border-y border-white/[0.07] py-6"><p className="font-mono text-[7px] uppercase tracking-[0.22em] text-cyan-200/40">{selected.kicker}</p><h3 className="mt-2 text-xl tracking-[-0.03em] text-white/85">{selected.label}</h3><p className="mt-4 text-[11px] leading-6 text-white/35">{selected.copy}</p></div><dl className="mt-6 space-y-4 font-mono text-[8px] uppercase tracking-[0.15em]"><div className="flex justify-between"><dt className="text-white/20">Model</dt><dd className="text-white/45">NIH 3D</dd></div><div className="flex justify-between"><dt className="text-white/20">Format</dt><dd className="text-white/45">GLB / 2.0</dd></div><div className="flex justify-between"><dt className="text-white/20">Loader</dt><dd className="text-cyan-200/55">Normalized</dd></div><div className="flex justify-between"><dt className="text-white/20">Material</dt><dd className="text-cyan-200/55">Converted</dd></div></dl><div className="mt-8 rounded-2xl border border-cyan-200/[0.08] bg-cyan-200/[0.025] p-4"><p className="font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-200/40">Visualization note</p><p className="mt-2 text-[10px] leading-5 text-white/30">Circuit, signal and navigation layers are illustrative research visualizations — not live neural measurements.</p></div></aside></div></div></section>;
}
