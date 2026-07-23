const r = await fetch('https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/vits-web.js');
const t = await r.text();

// Write full source for inspection
import { writeFileSync } from 'fs';
writeFileSync('.bob/tmp/vits-web-src.js', t);
console.log('File length:', t.length);

// Find key API patterns
const patterns = ['async function predict', 'function predict', 'export{', 'export function', 'SpeechT5', 'Vits', 'ort.', 'InferenceSession', 'fetch(', 'cacheKey', 'cache', 'IndexedDB', 'store'];
for (const p of patterns) {
  const idx = t.indexOf(p);
  if (idx !== -1) console.log(`\n--- ${p} at ${idx} ---\n${t.slice(idx, idx+300)}`);
}
