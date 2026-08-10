import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAVIGATION";
const MODEL_URL = "/NimbleBrain.glb";

const MODES: { id: Mode; label: string; kicker: string; copy: string }[] = [
  { id: "ANATOMY", label: "ANATOMICAL MAP", kicker: "STRUCTURE", copy: "High-fidelity anatomical substrate." },
  { id: "CIRCUIT", label: "CIRCUIT RECONSTRUCTION", kicker: "TOPOLOGY", copy: "Candidate pathways reconstructed across the anatomical surface." },
  { id: "SIGNAL", label: "SIGNAL PROPAGATION", kicker: "DYNAMICS", copy: "Animated propagation pulses over a reconstructed network." },
  { id: "NAVIGATION", label: "NANOROBOT NAVIGATION", kicker: "TRAJECTORY", copy: "Spatial simulation of navigation trajectories." },
];

function patchSpecGlossGLB(input: ArrayBuffer): ArrayBuffer {
  const view = new DataView(input);
  if (view.byteLength < 20) throw new Error("GLB is smaller than the minimum header size");
  const magic = new TextDecoder().decode(new Uint8Array(input, 0, 4));
  if (magic !== "glTF") throw new Error(`Invalid GLB header: ${magic || "empty"}`);

  const jsonLength = view.getUint32(12, true);
  if (jsonLength <= 0 || 20 + jsonLength > input.byteLength) throw new Error("Invalid GLB JSON chunk");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(input, 20, jsonLength)));
  const legacy = "KHR_materials_pbrSpecularGlossiness";
  const used: string[] = json.extensionsUsed ?? [];
  if (!used.includes(legacy)) return input;

  for (const material of json.materials ?? []) {
    const ext = material.extensions?.[legacy];
    if (!ext) continue;
    const diffuse = ext.diffuseFactor ?? [0.72, 0.72, 0.72, 1];
    const gloss = typeof ext.glossinessFactor === "number" ? ext.glossinessFactor : 0.5;
    material.pbrMetallicRoughness = {
      ...(material.pbrMetallicRoughness ?? {}),
      baseColorFactor: diffuse,
      metallicFactor: 0,
      roughnessFactor: Math.max(0.12, Math.min(1, 1 - gloss)),
    };
    delete material.extensions[legacy];
    if (!Object.keys(material.extensions).length) delete material.extensions;
  }

  json.extensionsUsed = used.filter((x) => x !== legacy);
  if (Array.isArray(json.extensionsRequired)) {
    json.extensionsRequired = json.extensionsRequired.filter((x: string) => x !== legacy);
    if (!json.extensionsRequired.length) delete json.extensionsRequired;
  }
  if (!json.extensionsUsed.length) delete json.extensionsUsed;

  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const padded = (encoded.length + 3) & ~3;
  const oldBinaryStart = 20 + jsonLength;
  const binary = new Uint8Array(input, oldBinaryStart);
  const output = new ArrayBuffer(20 + padded + binary.byteLength);
  const out = new Uint8Array(output);
  const outView = new DataView(output);
  out.set(new Uint8Array(input, 0, 12), 0);
  outView.setUint32(8, output.byteLength, true);
  outView.setUint32(12, padded, true);
  outView.setUint32(16, 0x4e4f534a, true);
  out.set(encoded, 20);
  out.set(binary, 20 + padded);
  return output;
}

async function fetchBinary(onProgress: (n: number) => void, signal: AbortSignal) {
  const response = await fetch(`${MODEL_URL}?v=nimble-1`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} while fetching ${MODEL_URL}`);
  const total = Number(response.headers.get("content-length") || 0);
  if (!response.body) {
    const data = await response.arrayBuffer();
    onProgress(100);
    return data;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (result.value) {
      chunks.push(result.value);
      received += result.value.byteLength;
      onProgress(total ? Math.min(99, (received / total) * 100) : Math.min(99, received / 131072));
    }
  }
  const data = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  onProgress(100);
  return data.buffer;
}

function BrainModel({ mode, onStatus }: { mode: Mode; onStatus: (s: "loading" | "ready" | "error", d: string, p?: number) => void }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("Model request timed out after 45 seconds"), 45000);
    onStatus("loading", "Downloading 13 MB anatomical specimen", 0);

    fetchBinary((p) => alive && onStatus("loading", "Downloading anatomical specimen", p), controller.signal)
      .then((raw) => {
        if (!alive) return;
        if (raw.byteLength < 20) throw new Error(`Received only ${raw.byteLength} bytes`);
        onStatus("loading", "Decoding anatomical geometry", 100);
        const patched = patchSpecGlossGLB(raw);
        const loader = new GLTFLoader();
        loader.parse(
          patched,
          "/",
          (gltf) => {
            if (!alive) return;
            const root = gltf.scene;
            root.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(root);
            if (box.isEmpty()) throw new Error("GLB decoded but contains no visible geometry");
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            root.position.sub(center);
            root.scale.setScalar(2.35 / Math.max(maxSize, 0.001));
            root.updateMatrixWorld(true);
            root.traverse((obj) => {
              if (!(obj as THREE.Mesh).isMesh) return;
              const mesh = obj as THREE.Mesh;
              mesh.frustumCulled = false;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mesh.material = mats.map((m) => {
                const src = m as THREE.MeshStandardMaterial;
                const color = src.color?.clone() ?? new THREE.Color("#8ca39f");
                color.lerp(new THREE.Color("#a7bcb8"), 0.18);
                return new THREE.MeshPhysicalMaterial({
                  color,
                  roughness: 0.46,
                  metalness: 0.015,
                  clearcoat: 0.22,
                  clearcoatRoughness: 0.42,
                  emissive: new THREE.Color("#05262b"),
                  emissiveIntensity: 0.12,
                });
              });
            });
            setScene(root);
            onStatus("ready", `Decoded ${Math.round(maxSize * 10) / 10}u specimen`, 100);
          },
          (error) => { if (alive) onStatus("error", error instanceof Error ? error.message : String(error)); },
        );
      })
      .catch((error) => {
        if (!alive || error?.name === "AbortError") {
          if (alive) onStatus("error", error?.message || "The model request timed out");
          return;
        }
        onStatus("error", error instanceof Error ? error.message : String(error));
      })
      .finally(() => window.clearTimeout(timeout));
    return () => { alive = false; controller.abort(); window.clearTimeout(timeout); };
  }, [onStatus]);

  if (!scene) return null;
  return <group><primitive object={scene} />{mode === "CIRCUIT" && <CircuitLayer />}{mode === "SIGNAL" && <SignalLayer />}{mode === "NAVIGATION" && <NavigationLayer />}</group>;
}

function CircuitLayer() {
  const points = useMemo(() => Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; const r = 0.65 + (i % 7) * 0.038; return new THREE.Vector3(Math.cos(a) * r * 1.18, Math.sin(a * 2.1) * 0.42, Math.sin(a) * r); }), []);
  return <group>{points.slice(0, -1).map((p, i) => <line key={`l${i}`}><bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([p, points[i + 1]])} /><lineBasicMaterial color={i % 5 === 0 ? "#bd91ff" : "#4ee9ff"} transparent opacity={0.42} depthWrite={false} /></line>)}{points.map((p, i) => <mesh key={`p${i}`} position={p}><sphereGeometry args={[i % 5 === 0 ? 0.026 : 0.014, 8, 8]} /><meshBasicMaterial color={i % 5 === 0 ? "#d0b1ff" : "#64efff"} /></mesh>)}</group>;
}

function SignalLayer() {
  const points = useMemo(() => Array.from({ length: 42 }, (_, i) => new THREE.Vector3(Math.sin(i * 1.91) * 0.82, Math.cos(i * 1.41) * 0.44, Math.sin(i * 0.83) * 0.7)), []);
  return <group>{points.slice(0, -1).map((p, i) => <SignalPath key={i} a={p} b={points[i + 1]} phase={i * 0.17} />)}</group>;
}
function SignalPath({ a, b, phase }: { a: THREE.Vector3; b: THREE.Vector3; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) { const t = (Math.sin(clock.elapsedTime * 3 + phase) + 1) / 2; ref.current.scale.setScalar(0.7 + t); ref.current.position.copy(a).lerp(b, t); } });
  return <><line><bufferGeometry attach="geometry" onUpdate={(g) => g.setFromPoints([a, b])} /><lineBasicMaterial color="#756cff" transparent opacity={0.22} depthWrite={false} /></line><mesh ref={ref}><sphereGeometry args={[0.021, 8, 8]} /><meshBasicMaterial color="#e2d9ff" /></mesh></>;
}
function NavigationLayer() { return <group>{Array.from({ length: 34 }, (_, i) => <Agent key={i} index={i} />)}</group>; }
function Agent({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const base = useMemo(() => new THREE.Vector3(Math.sin(index * 1.77) * 0.82, Math.cos(index * 1.23) * 0.43, Math.sin(index * 0.71) * 0.7), [index]);
  useFrame(({ clock }) => { if (!ref.current) return; const t = clock.elapsedTime * 0.24 + index * 0.41; ref.current.position.set(base.x + Math.sin(t) * 0.1, base.y + Math.sin(t * 1.3) * 0.065, base.z + Math.cos(t * 0.8) * 0.09); });
  return <mesh ref={ref} position={base}><sphereGeometry args={[0.016, 8, 8]} /><meshBasicMaterial color="#5eeaff" /></mesh>;
}

function Scene({ mode, onStatus }: { mode: Mode; onStatus: (s: "loading" | "ready" | "error", d: string, p?: number) => void }) {
  return <><color attach="background" args={["#020506"]} /><fog attach="fog" args={["#020506", 4.5, 9]} /><PerspectiveCamera makeDefault position={[0, 0.05, 4.25]} fov={31} /><ambientLight intensity={1.45} /><directionalLight position={[3, 4, 5]} intensity={2.8} color="#f1ffff" /><pointLight position={[-2.5, 1.8, 2.5]} intensity={9} distance={6} color="#19cfff" /><pointLight position={[2.4, -1.4, 1.8]} intensity={6} distance={5} color="#7656ff" /><BrainModel mode={mode} onStatus={onStatus} /><OrbitControls enablePan={false} enableDamping dampingFactor={0.06} minDistance={2} maxDistance={8} autoRotate autoRotateSpeed={0.14} /></>;
}

export function NimbleNeuralLab() {
  const [active, setActive] = useState<Mode>("CIRCUIT");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [detail, setDetail] = useState("Initializing specimen loader");
  const [progress, setProgress] = useState(0);
  const updateStatus = (s: "loading" | "ready" | "error", d: string, p?: number) => { setStatus(s); setDetail(d); if (p !== undefined) setProgress(p); };
  const selected = MODES.find((m) => m.id === active)!;

  return <section className="relative overflow-hidden bg-[#020404] text-white"><div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 50% 35%, rgba(80,225,255,.25), transparent 34%), linear-gradient(rgba(100,220,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(100,220,255,.35) 1px, transparent 1px)", backgroundSize: "100% 100%, 72px 72px, 72px 72px" }} /><div className="relative mx-auto max-w-[1540px] px-[clamp(1.25rem,4vw,4rem)] py-[clamp(5rem,9vw,8rem)]"><div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-4xl"><div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.35em] text-cyan-200/55"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" />NIMBLE / COGNIVANCE LABS<span className="h-px w-10 bg-cyan-200/15" />RESEARCH INSTRUMENT</div><h2 className="mt-7 text-[clamp(3.2rem,7.5vw,8rem)] font-medium leading-[0.82] tracking-[-0.07em]">Interrogate<br /><span className="bg-gradient-to-r from-white via-white to-cyan-100/35 bg-clip-text text-transparent">the living circuit.</span></h2><p className="mt-7 max-w-2xl text-sm leading-7 text-white/35">A cinematic interface for exploring anatomical structure and visualizing the research layers NIMBLE is designed to investigate.</p></div><div className="hidden max-w-[260px] pb-1 text-right lg:block"><p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/20">Specimen</p><p className="mt-2 text-[11px] text-white/45">Human brain / NIH 3D anatomical model</p></div></div>
    <div className="mt-12 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl">{MODES.map((m) => <button key={m.id} onClick={() => setActive(m.id)} className={`shrink-0 rounded-xl px-4 py-3 text-left transition-all ${active === m.id ? "bg-cyan-300/[0.08] ring-1 ring-cyan-300/20" : "hover:bg-white/[0.035]"}`}><span className={`block font-mono text-[7px] uppercase tracking-[0.2em] ${active === m.id ? "text-cyan-200/75" : "text-white/25"}`}>{m.kicker}</span><span className={`mt-1 block text-[9px] uppercase tracking-[0.08em] ${active === m.id ? "text-white/80" : "text-white/35"}`}>{m.label}</span></button>)}</div>
    <div className="relative mt-4 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#030708] shadow-[0_30px_100px_rgba(0,0,0,.45)]"><div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-black/25 px-5 py-3 backdrop-blur-md"><div className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/35">{selected.kicker} / NIMBLE VISUALIZATION ENGINE</div><div className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-[0.2em]"> <span className={`h-1.5 w-1.5 rounded-full ${status === "ready" ? "bg-cyan-300 shadow-[0_0_10px_#54e7ff]" : status === "error" ? "bg-red-400" : "bg-amber-300 animate-pulse"}`} />{status === "ready" ? "MODEL READY" : status === "error" ? "MODEL ERROR" : "LOADING MODEL"}</div></div>
      <div className="relative h-[min(72vh,760px)] min-h-[560px]"><Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}><Scene mode={active} onStatus={updateStatus} /></Canvas>
        {status !== "ready" && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><div className={`w-[min(420px,88%)] rounded-2xl border ${status === "error" ? "border-red-400/20 bg-red-950/20" : "border-cyan-200/10 bg-black/55"} p-6 text-center shadow-2xl backdrop-blur-xl`}><div className="font-mono text-[8px] uppercase tracking-[0.3em] text-cyan-200/50">NIMBLE / SPECIMEN LOADER</div><div className="mt-3 text-sm text-white/75">{status === "error" ? "Unable to decode anatomical model" : detail}</div>{status === "loading" && <div className="mx-auto mt-5 h-1 max-w-[280px] overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-300" style={{ width: `${Math.max(3, progress)}%` }} /></div>}{status === "error" && <div className="mt-4 break-words font-mono text-[8px] leading-5 text-red-200/55">{detail}</div>}</div></div>}
        <div className="absolute bottom-5 left-5 z-10 max-w-[310px] rounded-xl border border-white/[0.07] bg-black/35 p-4 backdrop-blur-md"><div className="font-mono text-[7px] uppercase tracking-[0.25em] text-cyan-200/45">{selected.label}</div><p className="mt-2 text-[10px] leading-5 text-white/40">{selected.copy}</p></div><div className="absolute bottom-5 right-5 z-10 hidden rounded-xl border border-white/[0.07] bg-black/35 px-4 py-3 font-mono text-[7px] uppercase tracking-[0.2em] text-white/25 md:block">DRAG TO ORBIT · SCROLL TO ZOOM</div>
      </div></div>
  </div></div></section>;
}
