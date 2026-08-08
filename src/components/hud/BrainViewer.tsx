import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} dispose={null} />;
}

export default function BrainViewer({ modelUrl = '/models/demo-tract.glb' }: { modelUrl?: string }) {
  return (
    <div style={{ width: '100%', height: 640, borderRadius: 12, overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <Model url={modelUrl} />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
