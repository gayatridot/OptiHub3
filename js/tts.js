function initTTSPage() {
    const scriptInput = document.querySelector(".script-input");
    const voiceSelect = document.getElementById("voice");
    const subtitleToggle = document.querySelector(".toggle-switch input");
    const generateBtn = document.querySelector(".btn-generate");
    const downloadBtn = document.querySelector(".btn-download");
    const playBtn = document.querySelector(".play-btn");
    const waveform = document.querySelector(".waveform");
    const timeSpans = document.querySelectorAll(".audio-player span");
    const currentTimeEl = timeSpans[0];
    const durationEl = timeSpans[1];
    const previewOverlayText = document.querySelector(".preview-overlay p");

    let chunkBuffers = []; 
    let combinedWavBlob = null; 
    let audioEngine = new Audio();
    let generatedText = "";

    // Dynamic self-healing fallback worker resolution logic
    let workerUrl = `${window.location.origin}/public/tts-worker.js`;
    let ttsWorker;

    try {
        ttsWorker = new Worker(workerUrl, { type: 'module' });
        setupWorkerHandlers();
    } catch (e) {
        fallbackToRootWorker();
    }

    function fallbackToRootWorker() {
        console.warn("Primary path failed. Attempting root fallback deployment mapping...");
        workerUrl = `${window.location.origin}/tts-worker.js`;
        try {
            ttsWorker = new Worker(workerUrl, { type: 'module' });
            setupWorkerHandlers();
        } catch (err) {
            console.error("Critical: All worker route initializations failed.", err);
        }
    }

    function setupWorkerHandlers() {
        ttsWorker.onerror = (event) => {
            // Catching silent 404 network routing drops before throwing user alerts
            if (!event.message && workerUrl.includes("/public/")) {
                ttsWorker.terminate();
                fallbackToRootWorker();
                return;
            }

            const errorMsg = event.message || "Failed to download worker script (404 Not Found or CORS restriction)";
            console.error("CRITICAL WORKER LIFECYCLE CRASH:", errorMsg, "at:", workerUrl);
            
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Audio";
            alert(`Worker Error: ${errorMsg}\nPath: ${workerUrl}`);
        };

        ttsWorker.onmessage = async (e) => {
            const { status, buffer, progress, error } = e.data;

            if (status === "chunk") {
                chunkBuffers.push(buffer);
                generateBtn.textContent = `Generating... ${progress}%`;
                
                if (chunkBuffers.length === 1) {
                    const initialBlob = new Blob([buffer], { type: 'audio/wav' });
                    audioEngine.src = URL.createObjectURL(initialBlob);
                    audioEngine.load();
                    audioEngine.addEventListener("loadedmetadata", () => {
                        durationEl.textContent = formatTime(audioEngine.duration);
                    });
                    downloadBtn.disabled = false;
                    previewOverlayText.textContent = subtitleToggle?.checked ? generatedText : "Voiceover streaming...";
                }
            } else if (status === "done") {
                generateBtn.disabled = false;
                generateBtn.textContent = "Generate Audio";
                previewOverlayText.textContent = subtitleToggle?.checked ? generatedText : "Voiceover synthesized!";
                
                combinedWavBlob = await mergeWavBuffersToMasterBlob(chunkBuffers);
                
                const currentPosition = audioEngine.currentTime;
                const wasPlaying = !audioEngine.paused;
                
                audioEngine.src = URL.createObjectURL(combinedWavBlob);
                audioEngine.load();
                audioEngine.currentTime = currentPosition;
                if (wasPlaying) audioEngine.play();
            } else if (status === "error") {
                console.error("MODEL ERROR SENT FROM WORKER:", error);
                generateBtn.disabled = false;
                generateBtn.textContent = "Generate Audio";
                alert(`Synthesis Layer Error: ${error}`);
            }
        };
    }

    const progressFill = document.createElement("div");
    progressFill.style.position = "absolute"; 
    progressFill.style.top = "0"; 
    progressFill.style.left = "0";
    progressFill.style.height = "100%"; 
    progressFill.style.width = "0%"; 
    progressFill.style.background = "var(--primary, #007bff)";
    progressFill.style.borderRadius = "inherit"; 
    progressFill.style.pointerEvents = "none";
    if (waveform) {
        waveform.style.position = "relative"; 
        waveform.style.overflow = "hidden"; 
        waveform.style.cursor = "pointer";
        waveform.appendChild(progressFill);
    }

    function formatTime(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
        return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
    }

    audioEngine.addEventListener("timeupdate", () => {
        const current = audioEngine.currentTime;
        const duration = audioEngine.duration || 0;
        const percent = duration > 0 ? (current / duration) * 100 : 0;
        progressFill.style.width = `${percent}%`;
        currentTimeEl.textContent = formatTime(current);
    });

    audioEngine.addEventListener("ended", () => {
        playBtn.textContent = "▶";
        progressFill.style.width = "0%";
        currentTimeEl.textContent = formatTime(0);
    });

    async function mergeWavBuffersToMasterBlob(buffers) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const decodedBuffers = await Promise.all(
            buffers.map(buf => audioCtx.decodeAudioData(buf.slice(0)))
        );
        
        if (decodedBuffers.length === 0) return null;

        const totalLength = decodedBuffers.reduce((acc, buf) => acc + buf.length, 0);
        const sampleRate = decodedBuffers[0].sampleRate;
        const numberOfChannels = decodedBuffers[0].numberOfChannels;
        
        const outputBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
            let offset = 0;
            const outputData = outputBuffer.getChannelData(channel);
            for (let buf of decodedBuffers) {
                outputData.set(buf.getChannelData(channel), offset);
                offset += buf.length;
            }
        }

        return bufferToWavBlob(outputBuffer);
    }

    function bufferToWavBlob(audioBuffer) {
        let numOfChan = audioBuffer.numberOfChannels,
            length = audioBuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

        setUint32(0x46464952);
        setUint32(length - 8);                         
        setUint32(0x45564157);
        setUint32(0x20746d66);
        setUint32(16);                                 
        setUint16(1);
        setUint16(numOfChan);
        setUint32(audioBuffer.sampleRate);
        setUint32(audioBuffer.sampleRate * 2 * numOfChan); 
        setUint16(numOfChan * 2);                      
        setUint16(16);
        setUint32(0x61746164);
        setUint32(length - pos - 4);                   

        for (i = 0; i < audioBuffer.numberOfChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }
        return new Blob([buffer], { type: 'audio/wav' });
    }

    generateBtn?.addEventListener("click", () => {
        const text = scriptInput.value.trim();
        if (!text) { alert("Please type or paste a script first."); return; }

        generatedText = text;
        audioEngine.pause();
        playBtn.textContent = "▶";
        chunkBuffers = [];
        combinedWavBlob = null;

        const selectedOption = voiceSelect.value.toLowerCase();
        const isHindi = selectedOption.includes("hindi");
        const isFemale = selectedOption.includes("female");
        const voiceKey = `${isHindi ? "hi" : "en"}-${isFemale ? "female" : "male"}`;

        generateBtn.disabled = true;
        generateBtn.textContent = "Initializing Model... 0%";
        downloadBtn.disabled = true;

        if (ttsWorker) {
            ttsWorker.postMessage({ action: "generate", text, voiceKey });
        }
    });

    playBtn?.addEventListener("click", () => {
        if (!audioEngine.src) return;
        if (!audioEngine.paused) {
            audioEngine.pause();
            playBtn.textContent = "▶";
        } else {
            audioEngine.play();
            playBtn.textContent = "⏸";
        }
    });

    downloadBtn?.addEventListener("click", async () => {
        if (!combinedWavBlob) return;

        downloadBtn.disabled = true;
        downloadBtn.textContent = "Encoding MP3...";

        if (typeof ffmpeg !== 'undefined') {
            try {
                const arrayBuffer = await combinedWavBlob.arrayBuffer();
                await ffmpeg.writeFile('input.wav', new Uint8Array(arrayBuffer));
                await ffmpeg.exec(['-i', 'input.wav', '-codec:a', 'libmp3lame', '-q:a', '4', 'output.mp3']);

                const mp3Data = await ffmpeg.readFile('output.mp3');
                const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mp3' });
                const mp3Url = URL.createObjectURL(mp3Blob);

                const a = document.createElement("a");
                a.href = mp3Url;
                a.download = "optihub_voiceover.mp3"; 
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                await ffmpeg.deleteFile('input.wav');
                await ffmpeg.deleteFile('output.mp3');
            } catch (err) {
                console.error("FFmpeg runtime conversion error, falling back to WAV:", err);
                triggerWavFallback();
            }
        } else {
            console.warn("FFmpeg library not initialized in DOM. Downloading native WAV fallback.");
            triggerWavFallback();
        }

        downloadBtn.disabled = false;
        downloadBtn.textContent = "Download MP3";
    });

    function triggerWavFallback() {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(combinedWavBlob);
        a.download = "optihub_voiceover.wav";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}