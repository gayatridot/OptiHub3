import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

// Race tts.predict() against a timeout so a stalled CDN request doesn't hang forever.
// Rejects after `ms` milliseconds with a clear message.
function predictWithTimeout(params, ms = 30000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`tts.predict timed out after ${ms / 1000}s for: "${params.text.slice(0, 40)}..."`)),
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

            self.postMessage({ status: "loading", progress: 20, message: "Loading voice model (first load may take 30-60s)..." });

            // Safe sentence split: String.match() returns null on some edge-case inputs
            const rawMatches = text.match(/[^,.\n!?]+[,.\n!?]*|\s+/g);
            const sentences = (rawMatches || [text]).filter(s => s.trim().length > 0);
            const totalChunks = sentences.length;

            if (totalChunks === 0) {
                throw new Error("No readable text content identified.");
            }

            self.postMessage({ status: "loading", progress: 25, message: "Synthesizing audio chunks..." });

            for (let i = 0; i < totalChunks; i++) {
                const sentenceText = sentences[i].trim();
                if (!sentenceText) continue;

                // 30-second per-sentence timeout prevents a single stalled request
                // from silently blocking the entire generation run
                const wavBlob = await predictWithTimeout({ text: sentenceText, voiceId }, 30000);

                const wavBuffer = await wavBlob.arrayBuffer();
                const pct = Math.min(99, Math.round(25 + ((i + 1) / totalChunks) * 75));

                // Transfer the buffer (zero-copy) — main thread receives it via e.data.buffer
                self.postMessage({ status: "chunk", buffer: wavBuffer, progress: pct }, [wavBuffer]);
            }

            self.postMessage({ status: "done", progress: 100 });

        } catch (err) {
            console.error("Worker processing exception:", err);
            self.postMessage({ status: "error", error: err.message || "Model assets failed to download or load." });
        }
    }
};