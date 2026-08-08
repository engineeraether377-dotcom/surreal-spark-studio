Run the script to download a demo glTF model into public/models/demo-tract.glb (this avoids committing large binaries from the CI).

Steps (run locally):

1. Check out the feature branch:
   git fetch origin feature/mvp-hud
   git checkout feature/mvp-hud

2. Run the downloader script (requires Node.js and network access):
   node scripts/fetch-demo-model.js

3. Commit and push the downloaded model:
   git add public/models/demo-tract.glb
   git commit -m "chore: add demo glTF model"
   git push origin feature/mvp-hud

After you push, the model will be available at /models/demo-tract.glb and the interactive viewer at /research will load it.
