"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bounds,
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  PerspectiveCamera,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

type ResearchMode =
  | "STRUCTURE"
  | "RECONSTRUCTION"
  | "SIGNAL"
  | "NAVIGATION";

interface Mode {
  id: ResearchMode;
  label: string;
  shortLabel: string;
  description: string;
}

const MODES: Mode[] = [
  {
    id: "STRUCTURE",
    label: "STRUCTURAL MAP",
    shortLabel: "STRUCTURE",
    description:
      "Volumetric visualization of the uploaded anatomical model.",
  },
  {
    id: "RECONSTRUCTION",
    label: "CIRCUIT RECONSTRUCTION",
    shortLabel: "RECONSTRUCTION",
    description:
      "Visualization layer for reconstructing candidate neural pathways.",
  },
  {
    id: "SIGNAL",
    label: "SIGNAL FLOW",
    shortLabel: "SIGNAL",
    description:
      "Simulated visualization of signal propagation through the reconstructed topology.",
  },
  {
    id: "NAVIGATION",
    label: "NANOROBOT NAVIGATION",
    shortLabel: "NAVIGATION",
    description:
      "Simulated spatial trajectories for future nanorobotic navigation research.",
  },
];

const TELEMETRY = [
  {
    label: "RECONSTRUCTION",
    value: "94.7",
    unit: "%",
  },
  {
    label: "RESOLUTION",
    value: "4.2",
    unit: "µm",
  },
  {
    label: "PATHWAYS",
    value: "1,824",
    unit: "",
  },
  {
    label: "LATENCY",
    value: "3.41",
    unit: "ms",
  },
];

function enhanceMaterial(material: THREE.Material) {
  const m = material as THREE.MeshStandardMaterial;

  if ("roughness" in m) {
    m.roughness = 0.58;
  }

  if ("metalness" in m) {
    m.metalness = 0.18;
  }

  if ("emissive" in m) {
    m.emissive = new THREE.Color("#061218");
    m.emissiveIntensity = 0.28;
  }
}

/* =========================================================
   BRAIN MODEL
========================================================= */

function BrainModel({
  mode,
  scanProgress,
}: {
  mode: ResearchMode;
  scanProgress: number;
}) {
  const { scene } = useGLTF("/BrainStem.glb");

  const model = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (!mesh.isMesh) return;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(enhanceMaterial);
      } else if (mesh.material) {
        enhanceMaterial(mesh.material);
      }
    });

    return clone;
  }, [scene]);

  return (
    <group>
      <primitive object={model} />

      {mode === "RECONSTRUCTION" && (
        <ReconstructionOverlay
          object={model}
          scanProgress={scanProgress}
        />
      )}

      {mode === "SIGNAL" && <SignalNetwork />}

      {mode === "NAVIGATION" && <NanorobotNetwork />}

      <ScanPlane
        visible={
          mode === "STRUCTURE" ||
          mode === "RECONSTRUCTION"
        }
        progress={scanProgress}
      />
    </group>
  );
}

/* =========================================================
   RECONSTRUCTION WIREFRAME
========================================================= */

function ReconstructionOverlay({
  object,
  scanProgress,
}: {
  object: THREE.Object3D;
  scanProgress: number;
}) {
  const geometries = useMemo(() => {
    const result: {
      geometry: THREE.BufferGeometry;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
    }[] = [];

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (!mesh.isMesh || !mesh.geometry) return;

      result.push({
        geometry: new THREE.EdgesGeometry(
          mesh.geometry,
          18
        ),
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
        scale: mesh.scale.clone(),
      });
    });

    return result;
  }, [object]);

  return (
    <group>
      {geometries.map((item, index) => (
        <lineSegments
          key={index}
          geometry={item.geometry}
          position={item.position}
          rotation={item.rotation}
          scale={item.scale}
        >
          <lineBasicMaterial
            color={
              scanProgress > 0.5
                ? "#50ddff"
                : "#7164ff"
            }
            transparent
            opacity={0.28}
          />
        </lineSegments>
      ))}

      <CircuitParticles />
    </group>
  );
}

/* =========================================================
   CIRCUIT PARTICLES
========================================================= */

function CircuitParticles() {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 700;
    const positions = new Float32Array(
      count * 3
    );

    for (let i = 0; i < count; i++) {
      const index = i * 3;

      positions[index] =
        (Math.random() - 0.5) * 2.6;

      positions[index + 1] =
        (Math.random() - 0.5) * 2.2;

      positions[index + 2] =
        (Math.random() - 0.5) * 2;
    }

    const geometry =
      new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    return geometry;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;

    ref.current.rotation.y =
      state.clock.elapsedTime * 0.035;

    ref.current.rotation.z =
      Math.sin(
        state.clock.elapsedTime * 0.2
      ) * 0.025;
  });

  return (
    <points
      ref={ref}
      geometry={geometry}
    >
      <pointsMaterial
        color="#53dfff"
        size={0.011}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}

/* =========================================================
   SIGNAL NETWORK
========================================================= */

function SignalNetwork() {
  const nodes = useMemo(() => {
    return Array.from(
      { length: 45 },
      (_, index) => ({
        id: index,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          (Math.random() - 0.5) * 1.9,
          (Math.random() - 0.5) * 1.8
        ),
      })
    );
  }, []);

  return (
    <group>
      {nodes.map((node) => (
        <SignalNode
          key={node.id}
          position={node.position}
          index={node.id}
        />
      ))}

      {nodes
        .slice(0, -1)
        .map((node, index) => (
          <SignalLine
            key={`${node.id}-${index}`}
            start={node.position}
            end={nodes[index + 1].position}
            delay={index * 0.08}
          />
        ))}
    </group>
  );
}

function SignalNode({
  position,
  index,
}: {
  position: THREE.Vector3;
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;

    const pulse =
      1 +
      Math.sin(
        state.clock.elapsedTime * 3 +
          index * 0.35
      ) *
        0.25;

    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh
      ref={ref}
      position={position}
    >
      <sphereGeometry
        args={[0.018, 8, 8]}
      />

      <meshBasicMaterial color="#8a7bff" />
    </mesh>
  );
}

function SignalLine({
  start,
  end,
  delay,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  delay: number;
}) {
  const ref = useRef<THREE.Line>(null);

  const geometry = useMemo(() => {
    const curve =
      new THREE.LineCurve3(
        start,
        end
      );

    return new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(24)
    );
  }, [start, end]);

  useFrame((state) => {
    if (!ref.current) return;

    const material =
      ref.current.material as THREE.LineBasicMaterial;

    material.opacity =
      0.12 +
      (Math.sin(
        state.clock.elapsedTime * 2.5 +
          delay
      ) +
        1) *
        0.12;
  });

  return (
    <line
      ref={ref}
      geometry={geometry}
    >
      <lineBasicMaterial
        color="#786aff"
        transparent
        opacity={0.18}
      />
    </line>
  );
}

/* =========================================================
   NANOROBOT NAVIGATION
========================================================= */

function NanorobotNetwork() {
  return (
    <group>
      {Array.from(
        { length: 22 },
        (_, index) => (
          <NanoBot
            key={index}
            index={index}
          />
        )
      )}
    </group>
  );
}

function NanoBot({
  index,
}: {
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  const initial =
    useMemo(
      () =>
        new THREE.Vector3(
          -1.15 +
            Math.random() * 2.3,
          -0.85 +
            Math.random() * 1.7,
          -0.85 +
            Math.random() * 1.7
        ),
      []
    );

  useFrame((state) => {
    if (!ref.current) return;

    const time =
      state.clock.elapsedTime *
        0.25 +
      index * 0.45;

    ref.current.position.x =
      initial.x +
      Math.sin(time) * 0.22;

    ref.current.position.y =
      initial.y +
      Math.cos(time * 0.8) * 0.18;

    ref.current.position.z =
      initial.z +
      Math.sin(time * 0.65) * 0.18;
  });

  return (
    <mesh
      ref={ref}
      position={initial}
    >
      <sphereGeometry
        args={[0.024, 10, 10]}
      />

      <meshBasicMaterial
        color="#51e8ff"
      />
    </mesh>
  );
}

/* =========================================================
   SCAN PLANE
========================================================= */

function ScanPlane({
  progress,
  visible,
}: {
  progress: number;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <mesh
      position={[
        0,
        -1.15 + progress * 2.3,
        0,
      ]}
    >
      <planeGeometry
        args={[3.3, 2.7]}
      />

      <meshBasicMaterial
        color="#51e4ff"
        transparent
        opacity={0.045}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* =========================================================
   THREE.JS SCENE
========================================================= */

function ResearchScene({
  mode,
  scanProgress,
}: {
  mode: ResearchMode;
  scanProgress: number;
}) {
  return (
    <>
      <color
        attach="background"
        args={["#020506"]}
      />

      <fog
        attach="fog"
        args={[
          "#020506",
          4.5,
          9,
        ]}
      />

      <PerspectiveCamera
        makeDefault
        position={[
          0,
          0.25,
          4.6,
        ]}
        fov={34}
      />

      <ambientLight intensity={0.5} />

      <directionalLight
        position={[3, 4, 4]}
        intensity={2}
        color="#d9f7ff"
      />

      <pointLight
        position={[-3, 1, 2]}
        intensity={12}
        distance={7}
        color="#1487ff"
      />

      <pointLight
        position={[2, -2, -1]}
        intensity={8}
        distance={6}
        color="#704cff"
      />

      <Environment preset="night" />

      <Bounds
        fit
        clip
        observe
        margin={1.35}
      >
        <BrainModel
          mode={mode}
          scanProgress={scanProgress}
        />
      </Bounds>

      <Grid
        position={[0, -1.25, 0]}
        args={[8, 8]}
        cellSize={0.15}
        cellThickness={0.3}
        cellColor="#123039"
        sectionSize={1}
        sectionThickness={0.7}
        sectionColor="#1a505d"
        fadeDistance={7}
        fadeStrength={1}
        infiniteGrid
      />

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.3}
        scale={5}
        blur={2}
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.8}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

/* =========================================================
   MAIN UI
========================================================= */

export default function NeuralResearchLab() {
  const [mode, setMode] =
    useState<ResearchMode>(
      "RECONSTRUCTION"
    );

  const [scanProgress, setScanProgress] =
    useState(0.48);

  const [isScanning, setIsScanning] =
    useState(false);

  const currentMode =
    MODES.find(
      (item) => item.id === mode
    )!;

  useEffect(() => {
    if (!isScanning) return;

    let animationFrame: number;

    const animate = () => {
      setScanProgress((previous) => {
        const next =
          previous + 0.0028;

        if (next >= 1) {
          setIsScanning(false);
          return 0;
        }

        return next;
      });

      animationFrame =
        requestAnimationFrame(
          animate
        );
    };

    animationFrame =
      requestAnimationFrame(
        animate
      );

    return () =>
      cancelAnimationFrame(
        animationFrame
      );
  }, [isScanning]);

  return (
    <section
      id="research-lab"
      className="relative overflow-hidden bg-[#020404] text-white"
    >
      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0">

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(80,220,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(80,220,255,.5) 1px, transparent 1px)",
            backgroundSize:
              "72px 72px",
          }}
        />

        <div className="absolute left-[15%] top-[10%] h-[600px] w-[600px] rounded-full bg-cyan-500/[0.025] blur-[180px]" />

        <div className="absolute right-[5%] top-[30%] h-[500px] w-[500px] rounded-full bg-violet-600/[0.025] blur-[180px]" />

      </div>

      <div className="relative mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">

        {/* HEADER */}

        <header className="max-w-5xl">

          <div className="flex items-center gap-4">

            <span className="font-mono text-[8px] uppercase tracking-[0.35em] text-cyan-300/55">
              COGNIVANCE LABS
            </span>

            <span className="h-px w-12 bg-cyan-300/20" />

            <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/25">
              Research Instrumentation
            </span>

          </div>

          <h1 className="mt-7 text-[clamp(3.3rem,7vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.065em]">

            Reconstructing
            <br />

            <span className="bg-gradient-to-r from-white via-white to-white/25 bg-clip-text text-transparent">
              the living circuit.
            </span>

          </h1>

          <p className="mt-8 max-w-2xl text-sm leading-7 text-white/35">
            An interactive research environment for
            visualizing neural structure, inferred
            pathways, signal propagation and future
            nanorobotic navigation.
          </p>

        </header>

        {/* MODE BAR */}

        <div className="mt-12 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 backdrop-blur-xl lg:flex-row lg:items-center">

          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">

            {MODES.map((item) => {
              const active =
                item.id === mode;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setMode(item.id)
                  }
                  className={`
                    whitespace-nowrap
                    rounded-xl
                    px-4
                    py-3
                    font-mono
                    text-[8px]
                    uppercase
                    tracking-[0.16em]
                    transition-all
                    ${
                      active
                        ? "bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/20"
                        : "text-white/25 hover:bg-white/[0.04] hover:text-white/60"
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}

          </div>

          <button
            type="button"
            onClick={() =>
              setIsScanning(true)
            }
            className="flex items-center justify-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-3 font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-200 transition hover:bg-cyan-300/10"
          >

            <span
              className={`h-1.5 w-1.5 rounded-full bg-cyan-300 ${
                isScanning
                  ? "animate-pulse shadow-[0_0_12px_rgba(103,232,249,.9)]"
                  : ""
              }`}
            />

            {isScanning
              ? "Scanning"
              : "Run reconstruction"}

          </button>

        </div>

        {/* MAIN WORKSPACE */}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* 3D VIEWPORT */}

          <div className="relative min-h-[620px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#030708] lg:min-h-[720px]">

            <Canvas
              dpr={[1, 1.75]}
              gl={{
                antialias: true,
                alpha: false,
              }}
            >
              <Suspense fallback={null}>
                <ResearchScene
                  mode={mode}
                  scanProgress={
                    scanProgress
                  }
                />
              </Suspense>
            </Canvas>

            {/* VIEWPORT HEADER */}

            <div className="pointer-events-none absolute left-5 right-5 top-5 flex items-start justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]" />

                  <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/45">
                    Live visualization
                  </span>

                </div>

                <p className="mt-2 font-mono text-[7px] uppercase tracking-[0.18em] text-white/20">
                  BRAINSTEM / SPECIMEN 001
                </p>

              </div>

              <div className="text-right">

                <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/20">
                  RENDER
                </p>

                <p className="mt-1 font-mono text-[8px] text-cyan-300/60">
                  WEBGL
                </p>

              </div>

            </div>

            {/* VIEWPORT FOOTER */}

            <div className="pointer-events-none absolute bottom-5 left-5 right-5 flex items-end justify-between">

              <div>

                <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-white/20">
                  Current layer
                </p>

                <p className="mt-1 text-[11px] text-white/55">
                  {currentMode.shortLabel}
                </p>

              </div>

              <div className="text-right">

                <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-white/20">
                  Scan position
                </p>

                <p className="mt-1 font-mono text-[11px] text-cyan-300/65">
                  {Math.round(
                    scanProgress * 100
                  )}
                  %
                </p>

              </div>

            </div>

            {/* CORNER MARKERS */}

            <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l border-t border-cyan-300/20" />

            <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r border-t border-cyan-300/20" />

            <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b border-l border-cyan-300/20" />

            <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b border-r border-cyan-300/20" />

          </div>

          {/* RIGHT ANALYSIS PANEL */}

          <aside className="flex flex-col gap-5">

            {/* ACTIVE MODE */}

            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">

              <div className="flex items-center justify-between">

                <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/25">
                  Analysis mode
                </span>

                <span className="font-mono text-[7px] text-cyan-300/50">
                  ACTIVE
                </span>

              </div>

              <h2 className="mt-5 text-xl font-medium tracking-[-0.03em]">
                {currentMode.label}
              </h2>

              <p className="mt-2 text-[10px] leading-5 text-white/30">
                {currentMode.description}
              </p>

            </div>

            {/* TELEMETRY */}

            <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.025]">

              <div className="border-b border-white/[0.07] px-5 py-4">

                <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/25">
                  System telemetry
                </span>

              </div>

              <div className="grid grid-cols-2">

                {TELEMETRY.map(
                  (item, index) => (
                    <div
                      key={item.label}
                      className={`
                        p-5
                        ${
                          index % 2 === 0
                            ? "border-r"
                            : ""
                        }
                        ${
                          index < 2
                            ? "border-b"
                            : ""
                        }
                        border-white/[0.07]
                      `}
                    >

                      <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/20">
                        {item.label}
                      </p>

                      <p className="mt-3 text-xl font-medium tracking-[-0.04em]">

                        {item.value}

                        <span className="ml-1 text-[9px] text-cyan-300/50">
                          {item.unit}
                        </span>

                      </p>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* RECONSTRUCTION */}

            <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">

              <div className="flex items-center justify-between">

                <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/25">
                  Reconstruction
                </span>

                <span className="font-mono text-[8px] text-cyan-300/60">
                  {Math.round(
                    scanProgress * 100
                  )}
                  %
                </span>

              </div>

              <div className="mt-5 h-[2px] overflow-hidden rounded-full bg-white/[0.08]">

                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-300 to-violet-400"
                  style={{
                    width: `${
                      scanProgress * 100
                    }%`,
                  }}
                />

              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">

                {[
                  "CAPTURE",
                  "RECONSTRUCT",
                  "VERIFY",
                ].map(
                  (label, index) => (
                    <div key={label}>

                      <div
                        className={`
                          mb-2 h-1 rounded-full
                          ${
                            scanProgress >
                            index / 3
                              ? "bg-cyan-300/60"
                              : "bg-white/[0.07]"
                          }
                        `}
                      />

                      <span className="font-mono text-[6px] uppercase tracking-[0.15em] text-white/20">
                        {label}
                      </span>

                    </div>
                  )
                )}

              </div>

            </div>

            {/* EVENT STREAM */}

            <div className="min-h-[210px] flex-1 rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">

              <div className="flex items-center justify-between">

                <span className="font-mono text-[8px] uppercase tracking-[0.25em] text-white/25">
                  Event stream
                </span>

                <span className="flex items-center gap-2 font-mono text-[7px] text-white/20">

                  <span className="h-1 w-1 rounded-full bg-green-400" />

                  ONLINE

                </span>

              </div>

              <div className="mt-5 space-y-3">

                {[
                  [
                    "12:41:08",
                    "Structural mesh updated",
                  ],
                  [
                    "12:41:09",
                    "Pathway candidate detected",
                  ],
                  [
                    "12:41:11",
                    "Signal topology resolved",
                  ],
                  [
                    "12:41:13",
                    "Node confidence recalculated",
                  ],
                  [
                    "12:41:15",
                    "Reconstruction frame committed",
                  ],
                ].map(
                  ([time, message]) => (
                    <div
                      key={time}
                      className="flex gap-3"
                    >

                      <span className="shrink-0 font-mono text-[7px] text-white/15">
                        {time}
                      </span>

                      <span className="text-[8px] text-white/30">
                        {message}
                      </span>

                    </div>
                  )
                )}

              </div>

            </div>

          </aside>

        </div>

        {/* CAPABILITIES */}

        <div className="mt-6 grid gap-4 md:grid-cols-3">

          {[
            {
              number: "01",
              title: "Circuit reconstruction",
              description:
                "Map structural geometry into a visualized network of candidate pathways and junctions.",
            },
            {
              number: "02",
              title: "Neural signal mapping",
              description:
                "Visualize propagation, activity nodes and temporal relationships across reconstructed topology.",
            },
            {
              number: "03",
              title: "Acoustic navigation",
              description:
                "Simulate navigation vectors and spatial trajectories for future nanorobotic instrumentation.",
            },
          ].map((item) => (
            <div
              key={item.number}
              className="group rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-6 transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.025]"
            >

              <div className="flex items-center justify-between">

                <span className="font-mono text-[8px] text-cyan-300/50">
                  {item.number}
                </span>

                <span className="h-px w-8 bg-white/10 transition-all group-hover:w-14 group-hover:bg-cyan-300/30" />

              </div>

              <h3 className="mt-8 text-sm font-medium text-white/70">
                {item.title}
              </h3>

              <p className="mt-2 max-w-sm text-[10px] leading-5 text-white/25">
                {item.description}
              </p>

            </div>
          ))}

        </div>

        {/* FOOTER */}

        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-5 sm:flex-row">

          <p className="font-mono text-[7px] uppercase tracking-[0.22em] text-white/15">
            Cognivance Labs / Research Interface
          </p>

          <p className="font-mono text-[7px] uppercase tracking-[0.18em] text-white/15">
            Visualization layers marked as simulation
            where applicable
          </p>

        </div>

      </div>
    </section>
  );
}

useGLTF.preload("/BrainStem.glb");
