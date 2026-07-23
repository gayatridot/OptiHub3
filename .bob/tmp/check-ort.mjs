const candidates = [
    // onnxruntime-web ESM builds
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.bundle.min.mjs',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.bundle.mjs',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.es6.min.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/index.js',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm.min.js',
    // cdnjs
    'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort.min.js',
    // unpkg
    'https://unpkg.com/onnxruntime-web@1.18.0/dist/ort.min.js',
    'https://unpkg.com/onnxruntime-web@1.18.0/dist/ort.bundle.min.mjs',
    // check package.json to see what exports exist
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/package.json',
];
for (const url of candidates) {
    const r = await fetch(url, { method: 'HEAD' });
    const size = r.headers.get('content-length');
    const kb = size ? Math.round(parseInt(size)/1024)+'KB' : '?';
    const ct = r.headers.get('content-type') || '?';
    console.log(r.status, kb, ct.slice(0,30), url.split('/').slice(-1)[0]);
}
