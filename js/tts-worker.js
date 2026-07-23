import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

// TIMEOUT STRATEGY:
// - First sentence: 3 minutes (180s). tts.predict() on the first call must download
//   the ONNX model (~60-80 MB) AND the WASM runtime from jsDelivr CDN before it can
//   run inference. On Vercel edge / slow connections this routinely takes 60-120s.
// - Subsequent sentences: 60s. Model is already in worker memory; only inference runs.
const FIRST_SENTENCE_TIMEOUT_MS  = 180_000; // 3 min — covers model download + inference
const SUBSEQUENT_SENTENCE_TIMEOUT_MS = 60_000; // 60s — inference only

function predictWithTimeout(params, ms) {
    return new Promise((resolve, reject) => {
        const label = params.text.slice(0, 40);
        const timer = setTimeout(
            () => reject(new Error(
                `tts.predict timed out after ${ms / 1000}s. ` +
                `The voice model (~80 MB) may still be downloading. ` +
                `Please click Retry to try again.`
            )),
            ms
        );
        tts.predict(params).then(
            result => { clearTimeout(timer); resolve(result); },
            err    => { clearTimeout(timer); reject(err); }
        );
    });
}

self.onmessage = async (e) => {
    const { action, text, voiceKey } = e.data;

    if (action === "generate") {
        try {
            self.postMessage({ status: "loading", progress: 10, message: "Initializing voice engine..." });

            let voiceId = 'en_US-lessac-medium';
            if (voiceKey === 'en-female') {
                voiceId = 'en_US-hfc_female-medium';
            } else if (voiceKey === 'hi-female' || voiceKey === 'hi-male') {
                voiceId = 'hi_IN-ispeech-medium';
            }

            self.postMessage({ status: "loading", progress: 20, message: "Loading voice model — first load downloads ~80 MB, please wait..." });

            // Safe sentence split: String.match() returns null on some edge-case inputs
            const rawMatches = text.match(/[^,.\n!?]+[,.\n!?]*|\s+/g);
            const sentences = (rawMatches || [text]).filter(s => s.trim().length > 0);
            const totalChunks = sentences.length;

            if (totalChunks === 0) {
                throw new Error("No readable text content identified.");
            }

            self.postMessage({ status: "loading", progress: 25, message: "Synthesizing audio..." });

            for (let i = 0; i < totalChunks; i++) {
                const sentenceText = sentences[i].trim();
                if (!sentenceText) continue;

                // First sentence carries the full model download cost; give it 3 minutes.
                // All subsequent sentences only do inference and get 60 seconds.
                const timeoutMs = i === 0
                    ? FIRST_SENTENCE_TIMEOUT_MS
                    : SUBSEQUENT_SENTENCE_TIMEOUT_MS;

                const wavBlob = await predictWithTimeout({ text: sentenceText, voiceId }, timeoutMs);

                const wavBuffer = await wavBlob.arrayBuffer();
                const pct = Math.min(99, Math.round(25 + ((i + 1) / totalChunks) * 75));

                // Transfer the buffer zero-copy — main thread receives it via e.data.buffer
                self.postMessage({ status: "chunk", buffer: wavBuffer, progress: pct }, [wavBuffer]);
            }

            self.postMessage({ status: "done", progress: 100 });

        } catch (err) {
            console.error("Worker processing exception:", err);
            self.postMessage({ status: "error", error: err.message || "Model failed to download. Check your connection and click Retry." });
        }
    }
};