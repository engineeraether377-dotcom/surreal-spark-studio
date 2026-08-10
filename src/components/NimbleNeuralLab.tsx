import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Line, OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Mode = "ANATOMY" | "CIRCUIT" | "SIGNAL" | "NAVIGATION";

const MODES: { id: Mode; label: string; kicker: string; copy: string }[] = [
  { id: "ANATOMY", label: "ANATOMICAL MAP", kicker: "STRUCTURE", copy: "High-fidelity anatomical substrate for the NIMBLE visualization stack." },
  { id: "CIRCUIT", label: "CIRCUIT RECONSTRUCTION", kicker: "TOPOLOGY", copy: "A visual reconstruction layer that traces candidate pathways across the anatomical surface." },
  { id: "SIGNAL", label: "SIGNAL PROPAGATION", kicker: "DYNAMICS", copy: "Animated propagation pulses reveal how a reconstructed network can be interrogated over time." },
  { id: "NAVIGATION", label: "NANOROBOT NAVIGATION", kicker: "TRAJECTORY", copy: "A spatial simulation layer for future navigation experiments inside neural tissue." },
];

function Model({ mode }: { mode: Mode }) {
  const { scene } = useGLTF("/NimbleBrain.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((raw) => {
        const mat = raw as THREE.MeshStandardMaterial;
        if ("roughness" in mat) mat.roughness = 0.62;
        if ("metalness" in mat) mat.metalness = 0.04;
        if ("color" in mat && mat.color) mat.color.multiplyScalar(0.92);
      });
    });
    return clone;
  }, [scene]);

  return (
    <group>
      <primitive object={model} />
      {mode === "CIRCUIT" && <CircuitLayer object={model} />}
      {mode === "SIGNAL" && <SignalLayer />}
      {mode === "NAVIGATION" && <NavigationLayer />}
    </group>
  );
}

function CircuitLayer({ object }: { object: THREE.Object3D }) {
  const edges = useMemo(() => {
    const result: THREE.BufferGeometry[] = [];
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) result.push(new THREE.EdgesGeometry(mesh.geometry, 28));
    });
    return result;
  }, [object]);

  const network = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * (0.75 + (i % 3) * 0.12), Math.sin(a * 1.7) * 0.6, Math.sin(a) * 0.85));
    }
    return points;
  }, []);

  return (
    <group>
      {edges.map((geometry, i) => (
        <lineSegments key={i} geometry={geometry}>
          <lineBasicMaterial color="#62e9ff" transparent opacity={0.16} />
        </lineSegments>
      ))}
      {network.slice(0, -1).map((p, i) => (
        <Line key={i} points={[p, network[i + 1]!]} color="#64e9ff" transparent opacity={0.48} lineWidth={0.7} />
      ))}
      <NetworkNodes points={network} />
    </group>
  );
}

function NetworkNodes({ points }: { points: THREE.Vector3[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.08;
  });
  return (
    <group ref={ref}>
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#b89cff" : "#62e9ff"} />
        </mesh>
      ))}
    </group>
  );
}

function SignalLayer() {
  const nodes = useMemo(() => Array.from({ length: 34 }, (_, i) => new THREE.Vector3((Math.random() - 0.5) * 1.9, (Math.random() - 0.5) * 1.45, (Math.random() - 0.5) * 1.5)), []);
  return (
    <group>
      {nodes.slice(0, -1).map((point, i) => <SignalLine key={i} start={point} end={nodes[i + 1]!} phase={i * 0.28} />)}
      {nodes.map((point, i) => <SignalNode key={i} position={point} phase={i * 0.37} />)}
    </group>
  );
}

function SignalLine({ start, end, phase }: { start: THREE.Vector3; end: THREE.Vector3; phase: number }) {
  const ref = useRef<THREE.Line>(null);
  useFrame((state) => {
    const material = ref.current?.material as THREE.LineBasicMaterial | undefined;
    if (material) material.opacity = 0.08 + (Math.sin(state.clock.elapsedTime * 2.2 + phase) + 1) * 0.11;
  });
  return <line ref={ref} geometry={new THREE.BufferGeometry().setFromPoints([start, end])}><lineBasicMaterial color="#927cff" transparent opacity={0.14} /></line>;
}

function SignalNode({ position, phase }: { position: THREE.Vector3; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.scale.setScalar(0.8 + (Math.sin(state.clock.elapsedTime * 3 + phase) + 1) * 0.35);
  });
  return <mesh ref={ref} position={position}><sphereGeometry args={[0.022, 10, 10]} /><meshBasicMaterial color="#aa91ff" /></mesh>;
}

function NavigationLayer() {
  return <group>{Array.from({ length: 22 }, (_, i) => <Agent key={i} index={i} />)}</group>;
}

function Agent({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const origin = useMemo(() => new THREE.Vector3((Math.random() - 0.5) * 1.7, (Math.random() - 0.5) * 1.25, (Math.random() - 0.5) * 1.35), []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.24 + index * 0.41;
    ref.current.position.set(origin.x + Math.sin(t) * 0.22, origin.y + Math.sin(t * 1.3) * 0.14, origin.z + Math.cos(t * 0.8) * 0.2);
  });
  return <mesh ref={ref} position={origin}><sphereGeometry args={[0.019, 8, 8]} /><meshBasicMaterial color="#62e9ff" /></mesh>;
}

function Scene({ mode }: { mode: Mode }) {
  return (
    <>
      <color attach="background" args={["#020506"]} />
      <fog attach="fog" args={["#020506", 4, 8.5]} />
      <PerspectiveCamera makeDefault position={[0, 0.05, 4.2]} fov={30} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#f4fcff" />
      <pointLight position={[-2.8, 1.4, 2]} intensity={9} distance={6} color="#1cbcff" />
      <pointLight position={[2.2, -1.6, 1]} intensity={7} distance={5} color="#7755ff" />
      <Environment preset="night" />
      <Model mode={mode} />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.055} minDistance={2.1} maxDistance={5.5} autoRotate autoRotateSpeed={0.16} />
    </>
  );
}

export function NimbleNeuralLab() {
  const [active, setActive] = useState<Mode>("CIRCUIT");
  const selected = MODES.find((m) => m.id === active)!;

  return (
    <section className="relative overflow-hidden bg-[#020404] text-white">
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 50% 35%, rgba(80,225,255,.25), transparent 34%), linear-gradient(rgba(100,220,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(100,220,255,.35) 1px, transparent 1px)", backgroundSize: "100% 100%, 72px 72px, 72px 72px" }} />
      <div className="relative mx-auto max-w-[1540px] px-[clamp(1.25rem,4vw,4rem)] py-[clamp(5rem,9vw,8rem)]">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.35em] text-cyan-200/55"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" />NIMBLE / COGNIVANCE LABS<span className="h-px w-10 bg-cyan-200/15" />RESEARCH INSTRUMENT</div>
            <h2 className="mt-7 text-[clamp(3.2rem,7.5vw,8rem)] font-medium leading-[0.82] tracking-[-0.07em]">Interrogate<br /><span className="bg-gradient-to-r from-white via-white to-cyan-100/35 bg-clip-text text-transparent">the living circuit.</span></h2>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/32">A cinematic interface for exploring anatomical structure and visualizing the research layers NIMBLE is designed to investigate.</p>
          </div>
          <div className="hidden max-w-[260px] pb-1 text-right lg:block"><p className="font-mono text-[8px] uppercase tracking-[0.22em] text-white/20">Specimen</p><p className="mt-2 text-[11px] text-white/45">Human brain / NIH 3D anatomical model</p><p className="mt-3 font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-300/40">Interactive visualization</p></div>
        </div>

        <div className="mt-12 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl">
          {MODES.map((item) => <button key={item.id} onClick={() => setActive(item.id)} className={`group relative shrink-0 rounded-xl px-4 py-3 text-left transition-all ${active === item.id ? "bg-cyan-300/[0.08] ring-1 ring-cyan-300/20" : "hover:bg-white/[0.035]"}`}><span className={`block font-mono text-[7px] uppercase tracking-[0.2em] ${active === item.id ? "text-cyan-200/75" : "text-white/25"}`}>{item.kicker}</span><span className={`mt-1 block text-[9px] uppercase tracking-[0.08em] ${active === item.id ? "text-white/80" : "text-white/35"}`}>{item.label}</span></button>)}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="relative h-[min(72vh,760px)] min-h-[560px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#030708] shadow-[0_30px_120px_rgba(0,0,0,.55)]">
            <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}><Suspense fallback={null}><Scene mode={active} /></Suspense></Canvas>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_20%,rgba(0,0,0,.34)_80%)]" />
            <div className="pointer-events-none absolute left-6 top-6 flex items-start gap-3"><div className="h-8 w-px bg-cyan-300/30" /><div><p className="font-mono text-[7px] uppercase tracking-[0.28em] text-cyan-200/50">Live visualization</p><p className="mt-1 font-mono text-[7px] uppercase tracking-[0.18em] text-white/20">NIMBLE / ANATOMICAL SUBSTRATE</p></div></div>
            <div className="pointer-events-none absolute right-6 top-6 text-right"><p className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/20">MODEL</p><p className="mt-1 font-mono text-[9px] text-white/45">GLB / 3D</p></div>
            <div className="pointer-events-none absolute bottom-6 left-6 right-6 flex items-end justify-between"><div><p className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/20">Layer</p><p className="mt-1 text-[11px] text-white/60">{selected.label}</p></div><p className="font-mono text-[7px] uppercase tracking-[0.22em] text-cyan-200/40">DRAG TO ORBIT · SCROLL TO ZOOM</p></div>
            <span className="pointer-events-none absolute left-4 top-4 h-10 w-10 border-l border-t border-cyan-300/15" /><span className="pointer-events-none absolute right-4 top-4 h-10 w-10 border-r border-t border-cyan-300/15" /><span className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 border-b border-l border-cyan-300/15" /><span className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 border-b border-r border-cyan-300/15" />
          </div>

          <aside className="space-y-4">
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl"><div className="flex items-center justify-between"><span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/25">Active layer</span><span className="font-mono text-[7px] text-cyan-300/45">{selected.kicker}</span></div><h3 className="mt-6 text-xl tracking-[-0.035em]">{selected.label}</h3><p className="mt-3 text-[10px] leading-5 text-white/30">{selected.copy}</p></div>
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-5"><span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/25">Research stack</span><div className="mt-5 space-y-0">{["ANATOMICAL MODEL", "STRUCTURAL MAPPING", "CIRCUIT LAYER", "SIGNAL DYNAMICS", "NAVIGATION SIMULATION"].map((label, i) => <div key={label} className="flex items-center border-b border-white/[0.06] py-3"><span className="mr-3 font-mono text-[7px] text-cyan-300/35">0{i + 1}</span><span className="text-[9px] tracking-[0.04em] text-white/40">{label}</span><span className="ml-auto h-1 w-1 rounded-full bg-cyan-300/50" /></div>)}</div></div>
            <div className="rounded-[22px] border border-cyan-300/10 bg-cyan-300/[0.025] p-5"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.8)]" /><span className="font-mono text-[7px] uppercase tracking-[0.22em] text-cyan-200/55">Demo mode</span></div><p className="mt-3 text-[9px] leading-5 text-white/30">The animated layers are research visualizations and simulations for demonstration. They are not presented as live experimental measurements.</p></div>
          </aside>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("/NimbleBrain.glb");
