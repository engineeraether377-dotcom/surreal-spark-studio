const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb';
const outDir = path.join(__dirname, '..', 'public', 'models');
const outPath = path.join(outDir, 'demo-tract.glb');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Downloading ${url} -> ${outPath}`);

const file = fs.createWriteStream(outPath);
https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download file: ${res.statusCode}`);
    process.exit(1);
  }
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download complete.');
    console.log('Now commit the file:');
    console.log('  git add public/models/demo-tract.glb');
    console.log('  git commit -m "chore: add demo glTF model"');
    console.log('  git push origin feature/mvp-hud');
  });
}).on('error', (err) => {
  fs.unlinkSync(outPath);
  console.error('Download error:', err.message);
  process.exit(1);
});
