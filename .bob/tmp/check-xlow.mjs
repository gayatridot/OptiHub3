const HF = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main";
// Check ALL x_low English models, plus any genuinely small voices
const models = {
    // English x_low (if any exist)
    'en_US-amy-low':          'en/en_US/amy/low/en_US-amy-low.onnx',
    // Non-English x_low for size comparison
    'ca_ES-upc_ona-x_low':    'ca/ca_ES/upc_ona/x_low/ca_ES-upc_ona-x_low.onnx',
    'es_ES-carlfm-x_low':     'es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx',
    'ne_NP-google-x_low':     'ne/ne_NP/google/x_low/ne_NP-google-x_low.onnx',
    'uk_UA-lada-x_low':       'uk/uk_UA/lada/x_low/uk_UA-lada-x_low.onnx',
    'kk_KZ-iseke-x_low':      'kk/kk_KZ/iseke/x_low/kk_KZ-iseke-x_low.onnx',
    // en_GB low
    'en_GB-southern_english_female-low': 'en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx',
    'en_US-lessac-low':       'en/en_US/lessac/low/en_US-lessac-low.onnx',
};
for (const [id, path] of Object.entries(models)) {
    try {
        const r = await fetch(`${HF}/${path}`, { method: 'HEAD' });
        const bytes = parseInt(r.headers.get('content-length') || '0');
        const mb = bytes ? (bytes/1_048_576).toFixed(1)+'MB' : 'unknown';
        console.log(r.status, mb.padStart(8), id);
    } catch(e) { console.log('ERR', id); }
}
