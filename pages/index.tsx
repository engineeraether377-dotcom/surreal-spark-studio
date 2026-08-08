import React from 'react';
import Head from 'next/head';
import '../src/styles/improvements.css';

export default function Home() {
  return (
    <main>
      <Head>
        <title>Surreal Spark Studio</title>
      </Head>

      <header style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}>
        <img src="/cognivance-logo.png" alt="logo" style={{ height: 48, marginRight: 12 }} />
        <h1>Surreal Spark Studio</h1>
      </header>

      <section style={{ padding: '2rem' }}>
        <img src="/hero-image.png" alt="hero" style={{ width: '100%', borderRadius: 12 }} />
      </section>

      <section style={{ padding: '2rem' }}>
        <h2>Meet the team</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <img src="/ansab-founder.jpeg" alt="Ansab" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
          <img src="/gulfam.jpeg" alt="Gulfam" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
          <img src="/hadeera.jpeg" alt="Hadeera" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
          <img src="/muhammad-rayyan.jpeg" alt="Muhammad Rayyan" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
          <img src="/ruhma.jpg" alt="Ruhma" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8 }} />
        </div>
      </section>
    </main>
  );
}
