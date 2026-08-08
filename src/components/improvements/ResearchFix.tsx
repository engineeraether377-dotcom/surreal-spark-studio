import React from 'react';
import '../../styles/improvements.css';
import BrainViewerStub from './BrainViewerStub';
import { asset } from '../../utils/asset';

export const ResearchFix: React.FC = () => {
  return (
    <section className="im-research">
      <header className="im-research-header">
        <h2>Research — From Raw MRI to Predictive Insight</h2>
        <p>High-resolution 3D fMRI, real-time tractography, neural circuit reconstruction, and pre-symptomatic prediction pipelines.</p>
      </header>

      <div className="im-research-grid">
        <article className="im-research-card">
          <h3>3D fMRI Volume Rendering</h3>
          <p>Volume-rendered activation maps (HCP datasets) with animated time-series overlays.</p>
          <img src={asset('/hero-image.png')} alt="fMRI preview" />
        </article>

        <article className="im-research-card">
          <h3>Real-time Tractography</h3>
          <p>Precomputed streamlines rendered with glowing shaders and temporal animation. Ideal for storytelling and flythroughs.</p>
          <img src={asset('/hero-image.png')} alt="tractography preview" />
        </article>

        <article className="im-research-card">
          <h3>Neural Circuit Reconstruction</h3>
          <p>Connectome graphs, node-importance overlays, and reconstructed microcircuits exported as glTF.</p>
          <img src={asset('/hero-image.png')} alt="connectome preview" />
        </article>

        <article className="im-research-card im-research-viewer">
          <h3>Interactive Viewer (demo)</h3>
          <p>Full-screen 3D viewer for glTF tractography and volume textures. Falls back to an image if WebGL is unavailable.</p>
          <BrainViewerStub modelUrl="/models/demo-tract.glb" />
        </article>
      </div>

      <aside className="im-research-notes">
        <h4>Pipeline summary</h4>
        <ul>
          <li>Data: Human Connectome Project (HCP), OpenNeuro</li>
          <li>Preprocessing: dcm2niix, FSL, ANTs</li>
          <li>Tractography: MRtrix3 / DIPY, export to glTF</li>
          <li>Visualization: react-three-fiber, vtk.js, neuroglancer (for massive volumes)</li>
        </ul>
      </aside>
    </section>
  );
};

export default ResearchFix;
