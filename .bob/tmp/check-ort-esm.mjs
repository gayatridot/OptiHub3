const urls = [
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.min.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.wasm.min.js',
];
for (const url of urls) {
    const r = await fetch(url, { method: 'HEAD' });
    const kb = Math.round(parseInt(r.headers.get('content-length')||0)/1024);
    console.log(r.status, kb+'KB', url.split('/').slice(-1)[0]);
}
// Also peek at the first 300 chars to confirm it's ESM
const r = await fetch('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.min.js');
const t = await r.text();
console.log('\nFirst 300 chars of esm/ort.min.js:');
console.log(t.slice(0, 300));
