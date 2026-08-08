import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html, useProgress } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url as string);
  // TypeScript/Next JSX config sometimes doesn't include r3f's intrinsic elements (primitive).
  // The simplest compatibility fix is to suppress the TS error for this line — it's a valid r3f pattern.
  // If you prefer a stricter approach, we can add project-level typings or set `jsx: "react-jsx"` in tsconfig.
  // @ts-ignore
  return <primitive object={gltf.scene} dispose={null} />;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white', padding: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 8 }}>
        Loading {Math.round(progress)}%
      </div>
    </Html>
  );
}

export default function BrainViewer({ modelUrl = '/BrainStem.glb' }: { modelUrl?: string }) {
  return (
    <div style={{ width: '100%', height: 640, borderRadius: 12, overflow: 'hidden', background: '#07070a' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={<Loader />}>
          <Model url={modelUrl} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
