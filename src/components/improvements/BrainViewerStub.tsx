import React from 'react';

type Props = { modelUrl?: string };

const BrainViewerStub: React.FC<Props> = ({ modelUrl = '/models/demo-tract.glb' }) => {
  return (
    <div style={{ width: '100%', height: 360, borderRadius: 12, overflow: 'hidden', background: '#0b0b0b' }}>
      {/* This is a stub. To enable interactive 3D, install @react-three/fiber and @react-three/drei and replace this with a Canvas that loads the glTF. */}
      <img src="/images/research-viewer-fallback.jpg" alt="viewer fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
};

export default BrainViewerStub;
