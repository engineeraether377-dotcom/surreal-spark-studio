This branch implements an interactive MVP HUD proof-of-concept using react-three-fiber.

What I added on feature/mvp-hud

- package.json updated with dependencies: three, @react-three/fiber, @react-three/drei
- src/components/hud/BrainViewer.tsx — an r3f Canvas that loads a glTF model with orbit controls and environment lighting
- pages/research.tsx — wired the new BrainViewer + a HUD sidebar so the interactive demo is immediately accessible at /research
- public/models/demo-tract.json — a pointer to a public glTF demo (BrainStem) to avoid committing large binary files to the repo

Notes
- The BrainViewer expects a model at /models/demo-tract.glb. For convenience I added public/models/demo-tract.json which points to a remote raw URL of a BrainStem glTF. The viewer code will accept absolute URLs or a local file path; you can replace the modelUrl with the hosted URL in BrainViewer import.
- If you want the glTF to be local, upload a small glTF to public/models/demo-tract.glb (or I can fetch the remote one and add it to the repo if you prefer).

How to test locally

1. git fetch origin feature/mvp-hud
2. git checkout feature/mvp-hud
3. npm install
4. npm run dev
5. Open http://localhost:3000/research

Next steps after review
- Replace the demo model with your precomputed tractography glTF to get the final look and load times.
- Add a shader-based streamline animation for glowing flow along fibers.
- Add HUD widgets: sparklines, radial gauges, thumbnails and presentation mode controls.

If you want, I can now fetch the remote glTF, convert it to a local binary and commit public/models/demo-tract.glb into the repo so the viewer loads offline. Reply “Commit model” and I’ll fetch and add it (note: it may add a ~MB binary to the repo).