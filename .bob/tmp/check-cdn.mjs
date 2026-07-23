const checks = [
    'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort.webgpu.min.mjs',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.webgpu.min.mjs',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.mjs',
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.js',
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
    'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
];
for (const url of checks) {
    const r = await fetch(url, { method: 'HEAD' });
    const size = r.headers.get('content-length');
    const mb = size ? (parseInt(size)/1048576).toFixed(1)+'MB' : 'unknown size';
    console.log(r.status, mb, url.split('/').slice(-1)[0], url);
}
