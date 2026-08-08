import React from 'react';
import HeroFix from '../src/components/improvements/HeroFix';
import MapFix from '../src/components/improvements/MapFix';
import TeamMember from '../src/components/improvements/TeamFix';

import '../src/styles/improvements.css';

export default function Home() {
  return (
    <main>
      <HeroFix />

      <section style={{ padding: '2rem' }}>
        <h2 style={{ textAlign: 'center' }}>Our Team</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Update these filenames if your public/ image names differ */}
          <TeamMember src="/images/team-1.jpg" name="Alice Doe" role="Founder & CEO" />
          <TeamMember src="/images/team-2.jpg" name="Bob Chan" role="CTO" />
          <TeamMember src="/images/team-3.jpg" name="Carmen Li" role="Head of Research" />
        </div>
      </section>

      <MapFix />
    </main>
  );
}
