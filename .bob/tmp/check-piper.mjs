// The vits-web library at cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/vits-web.js
// calls: import("./piper-DeOu3H9E.js")  and  import("onnxruntime-web")
// Verify piper-DeOu3H9E.js exists on the CDN
const r = await fetch('https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/piper-DeOu3H9E.js', { method: 'HEAD' });
const kb = Math.round(parseInt(r.headers.get('content-length')||0)/1024);
console.log('piper-DeOu3H9E.js:', r.status, kb+'KB');

// And check what wasmPaths the library sets — it uses cdnjs for ort wasm files
// B = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/"
const wasmFile = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm-simd-threaded.wasm';
const r2 = await fetch(wasmFile, { method: 'HEAD' });
console.log('ort-wasm-simd-threaded.wasm:', r2.status, Math.round(parseInt(r2.headers.get('content-length')||0)/1024/1024)+'MB');

const wasmFile2 = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/ort-wasm.wasm';
const r3 = await fetch(wasmFile2, { method: 'HEAD' });
console.log('ort-wasm.wasm:', r3.status, Math.round(parseInt(r3.headers.get('content-length')||0)/1024/1024)+'MB');
