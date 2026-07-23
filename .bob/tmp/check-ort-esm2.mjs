const r = await fetch('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/esm/ort.min.js');
const t = await r.text();
// Check for ESM markers
const hasExport = t.includes('export ') || t.includes('export{') || t.includes('export default');
const hasImport = t.startsWith('import ');
// Check the end for exports
console.log('Has export keyword:', hasExport);
console.log('Starts with import:', hasImport);
console.log('Last 400 chars:', t.slice(-400));
