// tts-worker.js
// Pipeline: @diffusionstudio/vits-web  →  piper-phonemize wasm (jsDelivr)
//                                      →  onnxruntime-web (importmap → jsDelivr ESM)
//                                      →  Piper ONNX voice model (HuggingFace, OPFS-cached)
import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

// All English Piper voices are ~60 MB regardless of low/medium/high tier.
// There is no x_low variant for English in this library's voice set.
// en_US-lessac-low: clear, natural male voice — the best quality/compatibility trade-off.
// en_US-kathleen-low: female counterpart, same ~60 MB size.
const VOICE_MAP = {
    'en-male':   'en_US-lessac-low',
    'en-female': 'en_US-kathleen-low',
    'hi-male':   'en_US-lessac-low',   // No Hindi in library; fall back to English
    'hi-female': 'en_US-kathleen-low',
};
const DEFAULT_VOICE = 'en_US-lessac-low';

self.onmessage = async (e) => {
    const { action, text, voiceKey } = e.data;
    if (action !== "generate") return;

    try {
        const voiceId = VOICE_MAP[voiceKey] ?? DEFAULT_VOICE;

        // Split text into sentences before starting so we can report accurate progress
        const rawMatches = text.match(/[^,.\n!?]+[,.\n!?]*|\s+/g);
        const sentences  = (rawMatches || [text]).filter(s => s.trim().length > 0);
        const total      = sentences.length;
        if (total === 0) throw new Error("No readable text content found.");

        self.postMessage({ status: "loading", progress: 5, message: "Starting voice engine…" });

        // Synthesize each sentence with a single tts.predict() call.
        // On first call predict() downloads the model from HuggingFace and caches
        // it in OPFS; on subsequent calls it reads from OPFS instantly.
        // No separate download() pre-warm step — predict() is the single entry point.
        for (let i = 0; i < total; i++) {
            const sentence = sentences[i].trim();
            if (!sentence) continue;

            const pct = Math.min(99, Math.round(6 + ((i + 1) / total) * 93));
            self.postMessage({
                status:   "loading",
                progress: pct,
                message:  i === 0
                    ? "Loading voice model (~60 MB, cached after first use)…"
                    : `Synthesizing ${i + 1} / ${total}…`,
            });

            // tts.predict() internally:
            //   1. Runs piper-phonemize.wasm to convert text → phoneme IDs
            //   2. Runs ONNX inference via onnxruntime-web (resolved by importmap)
            //   3. Returns WAV Blob
            const wavBlob   = await tts.predict({ text: sentence, voiceId });
            const wavBuffer = await wavBlob.arrayBuffer();

            // Transfer zero-copy — ArrayBuffer is detached in this worker after postMessage
            self.postMessage({ status: "chunk", buffer: wavBuffer, progress: pct }, [wavBuffer]);
        }

        self.postMessage({ status: "done", progress: 100 });

    } catch (err) {
        console.error("[TTS Worker]", err);
        self.postMessage({
            status: "error",
            error:  err.message || "Voice synthesis failed. Click Retry.",
        });
    }
};
