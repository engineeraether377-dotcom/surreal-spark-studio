import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  Environment,
  Line,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

type ResearchMode = "STRUCTURE" | "RECONSTRUCTION" | "SIGNAL" | "NAVIGATION";

const MODES: Array<{
  id: ResearchMode;
  label: string;
  description: string;
}> = [
  {
    id: "STRUCTURE",
    label: "STRUCTURAL MAP",
    description: "Interactive volumetric view of the uploaded BrainStem model.",
  },
  {
    id: "RECONSTRUCTION",
    label: "CIRCUIT RECONSTRUCTION",
    description: "Visualization layer for candidate neural pathway reconstruction.",
  },
  {
    id: "SIGNAL",
    label: "SIGNAL PROPAGATION",
    description: "Simulated activity propagation through a reconstructed topology.",
  },
  {
    id: "NAVIGATION",
    label: "NANOROBOT NAVIGATION",
    description: "Simulated spatial trajectories for future nanorobotic navigation research.",
  },
];

function prepareModel(scene: THREE.Object3D) {
  const clone = scene.clone(true);

  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];

    materials.forEach((material) => {
      const mat = material as THREE.MeshStandardMaterial;
      if ("roughness" in mat) mat.roughness = 0.5;
      if ("metalness" in mat) mat.metalness = 0.12;
      if ("emissive" in mat) {
        mat.emissive = new THREE.Color("#06151a");
        mat.emissiveIntensity = 0.18;
      }
    });
  });

  return clone;
}

function BrainModel({ mode }: { mode: ResearchMode }) {
  const { scene } = useGLTF("/BrainStem.glb");
  const model = useMemo(() => prepareModel(scene), [scene]);

  return (
    <group>
      <primitive object={model} />
      {mode === "RECONSTRUCTION" && <CircuitOverlay object={model} />}
      {mode === "SIGNAL" && <SignalNetwork />}
      {mode === "NAVIGATION" && <NavigationNetwork />}
    </group>
  );
}

function CircuitOverlay({ object }: { object: THREE.Object3D }) {
  const geometries = useMemo(() => {
    const result: THREE.BufferGeometry[] = [];

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      result.push(new THREE.EdgesGeometry(mesh.geometry, 22));
    });

    return result;
  }, [object]);

  return (
    <group>
      {geometries.map((geometry, index) => (
        <lineSegments key={index} geometry={geometry}>
          <lineBasicMaterial color="#4ce6ff" transparent opacity={0.28} />
        </lineSegments>
      ))}
      <CircuitParticles />
    </group>
  );
}

function CircuitParticles() {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const count = 850;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const n = i * 3;
      positions[n] = (Math.random() - 0.5) * 2.6;
      positions[n + 1] = (Math.random() - 0.5) * 2.1;
      positions[n + 2] = (Math.random() - 0.5) * 1.9;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.025;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#54e8ff" size={0.009} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

function SignalNetwork() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => ({
        index,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 1.9,
          (Math.random() - 0.5) * 1.8,
        ),
      })),
    [],
  );

  return (
    <group>
      {nodes.map((node) => (
        <SignalNode key={node.index} {...node} />
      ))}
      {nodes.slice(0, -1).map((node, index) => (
        <SignalLine
          key={`${node.index}-${index}`}
          start={node.position}
          end={nodes[index + 1].position}
          phase={index * 0.16}
        />
      ))}
    </group>
  );
}

function SignalNode({ position, index }: { position: THREE.Vector3; index: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + index * 0.35) * 0.3;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.018, 8, 8]} />
      <meshBasicMaterial color="#8978ff" />
    </mesh>
  );
}

function SignalLine({
  start,
  end,
  phase,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  phase: number;
}) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const points = useMemo(() => [start, end], [start, end]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.opacity =
      0.07 + (Math.sin(state.clock.elapsedTime * 2.4 + phase) + 1) * 0.08;
  });

  return <Line points={points} color="#7567ff" lineWidth={0.7} transparent opacity={0.15} />;
}

function NavigationNetwork() {
  return (
    <group>
      {Array.from({ length: 26 }, (_, index) => (
        <NavigationAgent key={index} index={index} />
      ))}
    </group>
  );
}

function NavigationAgent({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const origin = useMemo(
    () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 1.6,
        (Math.random() - 0.5) * 1.6,
      ),
    [],
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * 0.28 + index * 0.45;
    ref.current.position.x = origin.x + Math.sin(t) * 0.18;
    ref.current.position.y = origin.y + Math.cos(t * 0.8) * 0.15;
    ref.current.position.z = origin.z + Math.sin(t * 0.6) * 0.17;
  });

  return (
    <mesh ref={ref} position={origin}>
      <sphereGeometry args={[0.022, 8, 8]} />
      <meshBasicMaterial color="#55e8ff" />
    </mesh>
  );
}

function ResearchScene({ mode }: { mode: ResearchMode }) {
  return (
    <>
      <color attach="background" args={["#020506"]} />
      <fog attach="fog" args={["#020506", 4.5, 9]} />
      <PerspectiveCamera makeDefault position={[0, 0.1, 4.6]} fov={34} />

      <ambientLight intensity={0.48} />
      <directionalLight position={[3, 4, 5]} intensity={2} color="#e6fbff" />
      <pointLight position={[-3, 1, 2]} intensity={10} distance={7} color="#078dff" />
      <pointLight position={[2, -2, 0]} intensity={7} distance={6} color="#694cff" />
      <Environment preset="night" />

      <Bounds fit clip observe margin={1.2}>
        <BrainModel mode={mode} />
      </Bounds>

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.5}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.22}
      />
    </>
  );
}

export function BrainResearchLab() {
  const [active, setActive] = useState<ResearchMode>("RECONSTRUCTION");
  const mode = MODES.find((item) => item.id === active) ?? MODES[1];

  useEffect(() => {
    useGLTF.preload("/BrainStem.glb");
  }, []);

  return (
    <section id="brain-research-lab" className="relative overflow-hidden bg-[#020404] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(80,220,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(80,220,255,.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-[1500px] px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(5rem,10vw,9rem)]">
        <div className="max-w-4xl">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[8px] uppercase tracking-[0.35em] text-cyan-300/60">
              COGNIVANCE LABS
            </span>
            <span className="h-px w-10 bg-cyan-300/20" />
            <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/25">
              Research Instrument
            </span>
          </div>

          <h2 className="mt-7 text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.84] tracking-[-0.065em]">
            Reconstructing
            <br />
            <span className="bg-gradient-to-r from-white via-white to-white/25 bg-clip-text text-transparent">
              the living circuit.
            </span>
          </h2>

          <p className="mt-7 max-w-2xl text-sm leading-7 text-white/35">
            An interactive research surface for structural mapping, circuit reconstruction,
            signal propagation and future nanorobotic navigation.
          </p>
        </div>

        <div className="mt-12 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl">
          {MODES.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item.id)}
                className={`shrink-0 rounded-xl px-4 py-3 font-mono text-[8px] uppercase tracking-[0.16em] transition-all ${
                  selected
                    ? "bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20"
                    : "text-white/25 hover:bg-white/[0.04] hover:text-white/60"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="relative min-h-[650px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#030708]">
            <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: false }}>
              <Suspense fallback={null}>
                <ResearchScene mode={active} />
              </Suspense>
            </Canvas>

            <div className="pointer-events-none absolute left-5 right-5 top-5 flex justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/45">
                    Interactive specimen
                  </span>
                </div>
                <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.18em] text-white/20">
                  BRAINSTEM / MODEL 001
                </p>
              </div>
              <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-cyan-300/50">
                WEBGL / 3D
              </span>
            </div>

            <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex justify-between">
              <div>
                <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/20">Active layer</p>
                <p className="mt-1 text-[11px] text-white/55">{mode.label}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/20">Interaction</p>
                <p className="mt-1 font-mono text-[8px] text-cyan-300/55">DRAG / ZOOM</p>
              </div>
            </div>

            <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l border-t border-cyan-300/20" />
            <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r border-t border-cyan-300/20" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b border-l border-cyan-300/20" />
            <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b border-r border-cyan-300/20" />
          </div>

          <aside className="space-y-4">
            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">
              <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">
                Current analysis
              </span>
              <h3 className="mt-5 text-xl font-medium tracking-[-0.03em]">{mode.label}</h3>
              <p className="mt-3 text-[10px] leading-5 text-white/30">{mode.description}</p>
            </div>

            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025]">
              <div className="border-b border-white/[0.07] px-5 py-4">
                <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">
                  System readout
                </span>
              </div>
              <div className="grid grid-cols-2">
                {[
                  ["STRUCTURE", "ONLINE"],
                  ["MESH", "94.7%"],
                  ["PATHWAYS", "1,824"],
                  ["LATENCY", "3.41 ms"],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-r border-white/[0.07] p-5">
                    <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/20">{label}</p>
                    <p className="mt-3 text-lg font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">
              <span className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/25">
                Processing pipeline
              </span>
              <div className="mt-5 space-y-4">
                {[
                  "Volumetric registration",
                  "Structural segmentation",
                  "Pathway extraction",
                  "Topology reconstruction",
                  "Signal correlation",
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="font-mono text-[7px] text-cyan-300/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] text-white/40">{step}</span>
                    <span className="ml-auto h-1 w-1 rounded-full bg-cyan-300/60" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-cyan-300/60">
                  Demonstration layer
                </span>
              </div>
              <p className="mt-3 text-[9px] leading-5 text-white/30">
                Interactive overlays are visualization layers for research demonstration and are
                not presented as live experimental measurements.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("/BrainStem.glb");
