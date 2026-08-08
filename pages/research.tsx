import React from 'react';
import BrainViewer from '../src/components/hud/BrainViewer';
import '../src/styles/improvements.css';

export default function ResearchInteractive() {
  return (
    <main>
      <section style={{ padding: '2rem' }}>
        <h1>Research Interactive POC</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div>
            {/* Loading the uploaded model at /BrainStem.glb */}
            <BrainViewer modelUrl="/BrainStem.glb" />
          </div>
          <aside>
            <div style={{ marginBottom: '1rem', background: '#fff', padding: '1rem', borderRadius: 8 }}>
              <h3>Metrics</h3>
              <p>Activation: <strong>127.39</strong></p>
              <p>Connectivity score: <strong>113.62</strong></p>
            </div>
            <div style={{ background: '#fff', padding: '1rem', borderRadius: 8 }}>
              <h4>Timeline</h4>
              <p>Time-series scrubber placeholder</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
