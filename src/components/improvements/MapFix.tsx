import React from 'react';
import '../../styles/improvements.css';

export const MapFix: React.FC = () => {
  return (
    <section className="im-map-section">
      <div className="im-map-left">
        <h2>Global Research Map</h2>
        <p>Explore labs, connectomes, and analytics across institutions. Hover markers to see curated case studies.</p>
      </div>
      <div className="im-map-right">
        <div className="im-map-side-card">
          <div className="im-map-side-img-wrap">
            {/* Use hero-image.png as the side art placeholder */}
            <img className="im-map-side-img" src="/hero-image.png" alt="map side art" />
            <div className="im-map-glow" />
          </div>
          <div className="im-map-overlay">
            <h3>Interactive Tractography</h3>
            <p>Click to open full-screen 3D visualizer.</p>
            <a className="im-btn small" href="/map">Open map</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapFix;
