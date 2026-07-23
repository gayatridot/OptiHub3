export function initTTSPage() {
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

    const btnRetry = document.getElementById("btn-retry");
    const btnFallback = document.getElementById("btn-fallback");
    const statusBanner = document.getElementById("tts-status-banner");

    let chunkBuffers = [];
    let combinedWavBlob = null;
    let audioEngine = new Audio();
    let generatedText = "";

    let fallbackMode = false;
    let loadingTimeoutId = null;
    let lastProgress = 0;

    let ffmpegInstance = null;

    async function getFFmpeg() {
        if (ffmpegInstance) return ffmpegInstance;
        try {
            if (!window.FFmpegESM) {
                await new Promise(resolve => window.addEventListener("ffmpeg-esm-ready", resolve, { once: true }));
            }
            const { FFmpeg, toBlobURL } = window.FFmpegESM;
            ffmpegInstance = new FFmpeg();
            ffmpegInstance.on("log", ({ message }) => console.log("[FFmpeg Log]:", message));

            const isIsolated = window.crossOriginIsolated;
            const coreBase = isIsolated
                ? "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm"
                : "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

            const classWorkerURL = await toBlobURL(
                new URL('../ffmpeg-worker/worker.js', import.meta.url).href,
                'text/javascript'
            );

            await ffmpegInstance.load({
                coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm"),
                workerURL: isIsolated ? await toBlobURL(`${coreBase}/ffmpeg-core.worker.js`, "text/javascript") : undefined,
                classWorkerURL: classWorkerURL
            });
            return ffmpegInstance;
        } catch (err) {
            console.error("FFmpeg failed to load in TTS.", err);
            return null;
        }
    }

    function showError(msg) {
        if (statusBanner) {
            statusBanner.className = "tts-status-banner error";
            statusBanner.innerHTML = `<span>⚠️</span> Model Load Failed: ${msg}`;
            statusBanner.style.display = "flex";
        }
        if (generateBtn) generateBtn.style.display = "none";
        if (btnRetry) btnRetry.style.display = "inline-flex";
        if (btnFallback) btnFallback.style.display = "inline-flex";
        clearTimeout(loadingTimeoutId);
    }

    function resetUI() {
        if (statusBanner) statusBanner.style.display = "none";
        if (generateBtn) {
            generateBtn.style.display = "inline-flex";
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Audio";
        }
        if (btnRetry) btnRetry.style.display = "none";
        if (btnFallback) btnFallback.style.display = "none";
        fallbackMode = false;
        clearTimeout(loadingTimeoutId);
    }

    function startProgressTimeout() {
        clearTimeout(loadingTimeoutId);
        // 2-minute silent-crash guard. The worker now posts download progress messages
        // every few KB during model download, so this timer resets constantly during
        // a legitimate download. It only fires if the worker goes fully silent
        // (e.g. unhandled exception with no postMessage, or network dropped entirely).
        loadingTimeoutId = setTimeout(() => {
            if (lastProgress < 100 && !fallbackMode) {
                if (ttsWorker) ttsWorker.terminate();
                ttsWorker = null;
                showError("Voice engine stopped responding. Check your connection and click Retry.");
            }
        }, 120000); // 2 minutes
    }

    btnRetry?.addEventListener("click", () => {
        resetUI();
        if (ttsWorker) { ttsWorker.terminate(); ttsWorker = null; }
        spawnWorker();
        generateBtn.click();
    });

    btnFallback?.addEventListener("click", () => {
        fallbackMode = true;
        resetUI();
        generateBtn.textContent = "Synthesize (Browser Fallback)";
        if (statusBanner) {
            statusBanner.className = "tts-status-banner info";
            statusBanner.innerHTML = "<span>ℹ️</span> Using Browser Speech Synthesis Fallback.";
            statusBanner.style.display = "flex";
        }
    });

    // Resolve worker path relative to the JS module file, not the HTML page,
    // so it works correctly from both /html/*.html and clean-URL routes.
    const workerUrl = new URL('./tts-worker.js', import.meta.url).href;
    let ttsWorker = null;

    function spawnWorker() {
        try {
            ttsWorker = new Worker(workerUrl, { type: 'module' });
            setupWorkerHandlers();
            console.log("[TTS] Worker spawned:", workerUrl);
        } catch (err) {
            console.error("[TTS] Worker spawn failed:", err);
            ttsWorker = null;
        }
    }

    spawnWorker();

    // Keep for compatibility (btnRetry still calls this name)
    function fallbackToRootWorker() {
        spawnWorker();
    }

    function setupWorkerHandlers() {
        if (!ttsWorker) return;

        ttsWorker.onerror = (event) => {
            const errorMsg = event.message || "Worker script failed to load (404 or CORS). Check the console.";
            console.error("[TTS] Worker error:", errorMsg);
            clearTimeout(loadingTimeoutId);
            // Restore generate button so the user isn't locked out
            if (generateBtn) {
                generateBtn.style.display = "inline-flex";
                generateBtn.disabled = false;
                generateBtn.textContent = "Generate Audio";
            }
            showError(errorMsg);
        };

        ttsWorker.onmessage = async (e) => {
            const { status, buffer, progress, error, message } = e.data;

            // Reset stall timer on every progress signal
            if (status === "loading" || status === "chunk") {
                lastProgress = progress || 0;
                startProgressTimeout();
            }

            if (status === "loading") {
                if (generateBtn) generateBtn.textContent = `${message || "Loading..."} ${progress}%`;
            } else if (status === "chunk") {
                chunkBuffers.push(buffer);
                if (generateBtn) generateBtn.textContent = `Generating... ${progress}%`;

                if (chunkBuffers.length === 1) {
                    const initialBlob = new Blob([buffer], { type: 'audio/wav' });
                    audioEngine.src = URL.createObjectURL(initialBlob);
                    audioEngine.load();
                    audioEngine.addEventListener("loadedmetadata", () => {
                        if (durationEl) durationEl.textContent = formatTime(audioEngine.duration);
                    }, { once: true });
                    if (previewOverlayText) previewOverlayText.textContent = subtitleToggle?.checked ? generatedText : "Voiceover streaming...";
                }
            } else if (status === "done") {
                // Clear stall timer immediately — don't let it fire during the WAV merge step
                clearTimeout(loadingTimeoutId);

                if (previewOverlayText) previewOverlayText.textContent = subtitleToggle?.checked ? generatedText : "Voiceover synthesized!";

                // Await the full WAV assembly before enabling download (prevents race condition)
                combinedWavBlob = await mergeWavBuffersToMasterBlob(chunkBuffers);

                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.style.display = "inline-flex";
                    generateBtn.textContent = "Generate Audio";
                }

                const currentPosition = audioEngine.currentTime;
                const wasPlaying = !audioEngine.paused;

                audioEngine.src = URL.createObjectURL(combinedWavBlob);
                audioEngine.load();
                audioEngine.currentTime = currentPosition;
                if (wasPlaying) audioEngine.play();

                if (downloadBtn) downloadBtn.disabled = false;
            } else if (status === "error") {
                console.error("[TTS] Worker reported error:", error);
                clearTimeout(loadingTimeoutId);
                // Restore generate button before showing error so user can retry
                if (generateBtn) {
                    generateBtn.style.display = "inline-flex";
                    generateBtn.disabled = false;
                    generateBtn.textContent = "Generate Audio";
                }
                showError(error);
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

        if (fallbackMode) {
            generateBtn.disabled = true;
            generateBtn.textContent = "Synthesizing...";

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);

            const isFemale = voiceSelect.value.toLowerCase().includes("female");
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const preferredVoice = voices.find(v => v.lang.includes("en-US") && (isFemale ? (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira")) : (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david"))));
                if (preferredVoice) utterance.voice = preferredVoice;
            }

            utterance.onstart = () => {
                previewOverlayText.textContent = subtitleToggle?.checked ? generatedText : "Voiceover playing via browser...";
                durationEl.textContent = "--:--";
            };

            utterance.onend = () => {
                generateBtn.disabled = false;
                generateBtn.textContent = "Synthesize (Browser Fallback)";
            };

            window.speechSynthesis.speak(utterance);
            return;
        }

        chunkBuffers = [];
        combinedWavBlob = null;
        downloadBtn.disabled = true;

        const selectedOption = voiceSelect.value.toLowerCase();
        const isHindi = selectedOption.includes("hindi");
        const isFemale = selectedOption.includes("female");
        const voiceKey = `${isHindi ? "hi" : "en"}-${isFemale ? "female" : "male"}`;

        generateBtn.disabled = true;
        generateBtn.textContent = "Initializing Model... 0%";
        lastProgress = 0;
        startProgressTimeout();

        if (ttsWorker) {
            ttsWorker.postMessage({ action: "generate", text, voiceKey });
        }
    });

    playBtn?.addEventListener("click", () => {
        // audioEngine.src is always a string; use readyState to test if media is loaded
        if (audioEngine.readyState === 0) return;
        if (!audioEngine.paused) {
            audioEngine.pause();
            playBtn.textContent = "▶";
        } else {
            audioEngine.play();
            playBtn.textContent = "⏸";
        }
    });

    downloadBtn?.addEventListener("click", async () => {
        if (!combinedWavBlob) {
            alert("Audio is still being processed. Please wait for generation to complete.");
            return;
        }

        downloadBtn.disabled = true;
        downloadBtn.textContent = "Encoding MP3...";

        try {
            const ffmpeg = await getFFmpeg();
            if (ffmpeg) {
                // Remove stale VFS files from any previous encode run
                try { await ffmpeg.deleteFile('input.wav'); } catch (_) {}
                try { await ffmpeg.deleteFile('output.mp3'); } catch (_) {}
                try { await ffmpeg.deleteFile('output.aac'); } catch (_) {}

                const arrayBuffer = await combinedWavBlob.arrayBuffer();
                await ffmpeg.writeFile('input.wav', new Uint8Array(arrayBuffer));

                let finalData = null;
                let finalType = 'audio/mp3';
                let finalExt = 'mp3';

                try {
                    await ffmpeg.exec(['-i', 'input.wav', '-c:a', 'libmp3lame', '-q:a', '2', 'output.mp3']);
                    finalData = await ffmpeg.readFile('output.mp3');
                } catch (mp3Err) {
                    console.warn("MP3 encoding failed, attempting AAC fallback:", mp3Err);
                    try {
                        await ffmpeg.exec(['-i', 'input.wav', '-c:a', 'aac', '-b:a', '128k', 'output.aac']);
                        finalData = await ffmpeg.readFile('output.aac');
                        finalType = 'audio/aac';
                        finalExt = 'aac';
                    } catch (aacErr) {
                        throw new Error("Both MP3 and AAC encoding failed");
                    }
                }

                const outBlob = new Blob([finalData.buffer], { type: finalType });
                const outUrl = URL.createObjectURL(outBlob);

                const a = document.createElement("a");
                a.href = outUrl;
                a.download = `optihub_voiceover.${finalExt}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Clean up only the file that was actually written
                try { await ffmpeg.deleteFile('input.wav'); } catch (_) {}
                try { await ffmpeg.deleteFile(`output.${finalExt}`); } catch (_) {}
            } else {
                console.warn("FFmpeg not available. Downloading native WAV fallback.");
                triggerWavFallback();
            }
        } catch (err) {
            console.error("FFmpeg compression error, falling back to WAV:", err);
            triggerWavFallback();
        } finally {
            // Always restore button — even if an error or early return occurred
            downloadBtn.disabled = false;
            downloadBtn.textContent = "Download MP3";
        }
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