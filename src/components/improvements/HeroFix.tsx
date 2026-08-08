import React from 'react';
import '../../styles/improvements.css';
import { asset } from '../../utils/asset';

export const HeroFix: React.FC = () => {
  return (
    <section className="im-hero">
      <div className="im-hero-left">
        <img className="im-logo" src={asset('/cognivance-logo.png')} alt="Surreal Spark Studio" />
        <h1 className="im-hero-title">Surreal Spark Studio</h1>
        <p className="im-hero-sub">High-fidelity neurovisualizations — fMRI, tractography, and predictive analytics rendered for storytelling.</p>
        <div className="im-hero-ctas">
          <a className="im-btn primary" href="/demo">Live demo</a>
          <a className="im-btn ghost" href="/research">Research</a>
        </div>
      </div>
      <div className="im-hero-right">
        {/* Use your hero-image.png from public/ */}
        <div className="im-hero-visual">
          <img src={asset('/hero-image.png')} alt="3D brain preview" />
        </div>
      </div>
    </section>
  );
};

export default HeroFix;
