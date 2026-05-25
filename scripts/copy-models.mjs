import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = join(root, 'public', 'models', 'wasm');
const modelDest = join(root, 'public', 'models', 'hand_landmarker.task');

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

// 1. Copy WASM files
mkdirSync(dest, { recursive: true });
for (const file of WASM_FILES) {
  copyFileSync(join(src, file), join(dest, file));
  console.log(`Copied: ${file}`);
}
console.log(`WASM files copied to public/models/wasm/`);

// 2. Download model file (skip if already present)
if (!existsSync(modelDest)) {
  console.log(`Downloading model from ${MODEL_URL} ...`);
  const resp = await fetch(MODEL_URL);
  if (!resp.ok) throw new Error(`Failed to download model: HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  mkdirSync(dirname(modelDest), { recursive: true });
  writeFileSync(modelDest, buf);
  console.log(`Downloaded hand_landmarker.task (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
} else {
  console.log('Model file already exists, skipping download.');
}

console.log('Done.');
