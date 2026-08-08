This branch contains non-destructive, reviewable UI improvements for Surreal Spark Studio.

What I changed (branch: improve/hero-map-research-team-images)

- Added a set of improvement components (not wired into pages yet) that you can import where appropriate:
  - src/components/improvements/HeroFix.tsx
  - src/components/improvements/TeamFix.tsx
  - src/components/improvements/MapFix.tsx
  - src/components/improvements/ResearchFix.tsx
  - src/components/improvements/BrainViewerStub.tsx

- Added a stylesheet with focused styles for the hero, team, map, and research sections:
  - src/styles/improvements.css

How to review

1. Checkout the branch locally:
   git fetch origin improve/hero-map-research-team-images
   git checkout -b improve/hero-map-research-team-images origin/improve/hero-map-research-team-images

2. Inspect the new files under src/components/improvements and src/styles.

3. Integrate the components into pages you want to update. Example (Next.js page):

   // pages/index.tsx (example integration)
   import HeroFix from 'src/components/improvements/HeroFix';
   import TeamFix from 'src/components/improvements/TeamFix';

   export default function Home() {
     return (
       <>
         <HeroFix />
         {/* ... */}
       </>
     );
   }

Notes & recommendations

- Team images, logo and hero assets: the components assume images are in /public/images/ and logo is /logo.svg. Because you stated all images are in public/, no uploads were added in this commit — the components reference those existing files.

- If you use Next.js Image component in the project, you may prefer to swap plain <img> for next/image. The current components use <img> to avoid configuration friction during review.

- For the Research interactive viewer, the current "BrainViewerStub" uses a fallback image. To enable full interactive 3D, install these packages and replace the stub with a react-three-fiber Canvas:
  - @react-three/fiber
  - @react-three/drei
  - three

- Accessibility: alt attributes are set; buttons and links are semantic.

Next steps I can take after you review/approve the PR

- Wire these components directly into the pages (index or /research) and remove any existing grayscale filters that may be forcing team portraits to black-and-white.
- Replace the stub with a working react-three-fiber viewer that loads precomputed glTF models (I can add a small demo .glb if you want me to include assets).
- Add automated screenshot preview in the PR and adjust styles to perfectly match your brand colors.

If you want me to proceed to open a pull request with these changes merged into the branch as a PR, tell me and I will open it and include screenshots and a detailed PR description.