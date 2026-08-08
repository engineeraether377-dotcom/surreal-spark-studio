import React from 'react';
import HeroFix from '../src/components/improvements/HeroFix';
import MapFix from '../src/components/improvements/MapFix';
import TeamMember from '../src/components/improvements/TeamFix';

import '../src/styles/improvements.css';
import { asset } from '../src/utils/asset';

export default function Home() {
  return (
    <main>
      <HeroFix />

      <section style={{ padding: '2rem' }}>
        <h2 style={{ textAlign: 'center' }}>Our Team</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Using your public/ filenames (case sensitive). encodeURI for spaces. */}
          <TeamMember src="/Ansab-founder.jpeg" name="Ansab" role="Founder & CEO" />
          <TeamMember src="/Gulfam.jpeg" name="Gulfam" role="CTO" />
          <TeamMember src="/Hadeera.jpeg" name="Hadeera" role="Head of Research" />
          <TeamMember src="/Muhammad Rayyan.jpeg" name="Muhammad Rayyan" role="Research Engineer" />
          <TeamMember src="/Ruhma.jpg" name="Ruhma" role="Product" />
        </div>
      </section>

      <MapFix />
    </main>
  );
}
