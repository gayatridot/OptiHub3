const r = await fetch('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/package.json');
const pkg = await r.json();
console.log('main:', pkg.main);
console.log('module:', pkg.module);
console.log('exports:', JSON.stringify(pkg.exports, null, 2));
console.log('browser:', JSON.stringify(pkg.browser, null, 2));
