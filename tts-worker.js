import * as tts from 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';

self.onmessage = async (e) => {
    const { action, text, voiceKey } = e.data;

    if (action === "generate") {
        try {
            const availableVoices = await tts.voices();
            console.log("📋 ALL VALID AVAILABLE VOICE MODEL IDs:", Object.keys(availableVoices));

            let voiceId = 'en_US-lessac-medium'; 
            
            // for future expansion, you can add more voice mappings here
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
                const pct = Math.round(((i + 1) / totalChunks) * 100);

                self.postMessage({ status: "chunk", buffer: wavBuffer, progress: pct }, [wavBuffer]);
            }

            self.postMessage({ status: "done" });

        } catch (err) {
            self.postMessage({ status: "error", error: err.message });
        }
    }
};