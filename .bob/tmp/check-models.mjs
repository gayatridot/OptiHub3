// Check actual ONNX model sizes from HuggingFace for candidate low/x_low voices
const HF = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main";
const models = {
    'en_US-danny-low':    'en/en_US/danny/low/en_US-danny-low.onnx',
    'en_US-kathleen-low': 'en/en_US/kathleen/low/en_US-kathleen-low.onnx',
    'en_US-lessac-low':   'en/en_US/lessac/low/en_US-lessac-low.onnx',
    'en_US-amy-low':      'en/en_US/amy/low/en_US-amy-low.onnx',
    'en_US-ryan-low':     'en/en_US/ryan/low/en_US-ryan-low.onnx',
    'en_US-ryan-medium':  'en/en_US/ryan/medium/en_US-ryan-medium.onnx',
    'en_US-lessac-medium':'en/en_US/lessac/medium/en_US-lessac-medium.onnx',
};
for (const [id, path] of Object.entries(models)) {
    try {
        const r = await fetch(`${HF}/${path}`, { method: 'HEAD' });
        const bytes = parseInt(r.headers.get('content-length') || '0');
        const mb = bytes ? (bytes/1_048_576).toFixed(1)+'MB' : 'unknown';
        console.log(r.status, mb.padStart(8), id);
    } catch(e) {
        console.log('ERR', id, e.message);
    }
}
