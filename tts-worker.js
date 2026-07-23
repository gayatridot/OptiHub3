import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

self.onmessage = async (e) => {
    const { action, text, voiceKey } = e.data;

    if (action === "generate") {
        try {
            self.postMessage({ status: "loading", progress: 5, message: "Initializing voice engine..." });

            // Fetch available voices with active timeout/catch
            let availableVoices = null;
            try {
                availableVoices = await tts.voices();
                console.log("📋 Available voice model IDs:", Object.keys(availableVoices || {}));
            } catch (vErr) {
                console.warn("Could not retrieve voices index, proceeding with default mappings:", vErr);
            }

            self.postMessage({ status: "loading", progress: 15, message: "Loading voice model files..." });

            let voiceId = 'en_US-lessac-medium'; 
            
            if (voiceKey === 'en-female') {
                voiceId = 'en_US-hfc_female-medium'; 
            } else if (voiceKey === 'hi-female') {
                voiceId = 'hi_IN-ispeech-medium'; 
            } else if (voiceKey === 'hi-male') {
                voiceId = 'hi_IN-ispeech-medium'; 
            }

            const sentences = text.match(/[^,.\n!?]+[,.\n!?]*|\s+/g).filter(s => s.trim().length > 0);
            const totalChunks = sentences.length;

            if (totalChunks === 0) {
                throw new Error("No readable text content identified.");
            }

            self.postMessage({ status: "loading", progress: 25, message: "Synthesizing audio chunks..." });

            for (let i = 0; i < totalChunks; i++) {
                const sentenceText = sentences[i].trim();
                if (!sentenceText) continue;

                const wavBlob = await tts.predict({
                    text: sentenceText,
                    voiceId: voiceId,
                    wasmBase: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/',
                    onnxBase: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/dist/',
                    crossOrigin: 'anonymous'
                });

                const wavBuffer = await wavBlob.arrayBuffer();
                const pct = Math.min(99, Math.round(25 + ((i + 1) / totalChunks) * 75));

                self.postMessage({ status: "chunk", buffer: wavBuffer, progress: pct }, [wavBuffer]);
            }

            self.postMessage({ status: "done", progress: 100 });

        } catch (err) {
            console.error("Worker processing exception:", err);
            self.postMessage({ status: "error", error: err.message || "Model assets failed to download or load." });
        }
    }
};