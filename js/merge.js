// js/merge.js
console.log("MERGE.JS VERSION: restored-stable");

let ffmpegInstance = null;

async function getFFmpeg() {
    if (ffmpegInstance) return { ffmpeg: ffmpegInstance, fetchFile: window.FFmpegESM.fetchFile };

    if (!window.FFmpegESM) {
        await new Promise(resolve => window.addEventListener("ffmpeg-esm-ready", resolve, { once: true }));
    }

    const { FFmpeg, toBlobURL, fetchFile } = window.FFmpegESM;
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

    return { ffmpeg: ffmpegInstance, fetchFile };
}

export async function initAudioVideoPage() {
    const changeAudioBtn = document.getElementById("change-audio-btn");
    const changeVideoBtn = document.getElementById("change-video-btn");
    const mergeBtn = document.getElementById("merge-preview-btn");
    const downloadMp4Btn = document.getElementById("download-mp4-btn");
    const previewBox = document.getElementById("preview-box");

    if (!changeAudioBtn || !changeVideoBtn || !mergeBtn) return;

    const audioInput = document.createElement("input");
    audioInput.type = "file";
    audioInput.accept = "audio/*";

    const videoInput = document.createElement("input");
    videoInput.type = "file";
    videoInput.accept = "video/*";

    let audioFile = null;
    let videoFile = null;
    let mergedBlobUrl = null;

    changeAudioBtn.addEventListener("click", () => audioInput.click());
    audioInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            audioFile = e.target.files[0];
            const audioInfo = document.getElementById("audio-file-info");
            if (audioInfo) audioInfo.textContent = `♪ ${audioFile.name}`;
        }
    });

    changeVideoBtn.addEventListener("click", () => videoInput.click());
    videoInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            videoFile = e.target.files[0];
            const videoInfo = document.getElementById("video-file-info");
            if (videoInfo) videoInfo.textContent = `📄 ${videoFile.name}`;

            if (previewBox) {
                previewBox.innerHTML = `
                    <video id="preview-video-element" style="width: 100%; max-height: 450px; border-radius: 8px;" controls>
                        <source src="${URL.createObjectURL(videoFile)}" type="${videoFile.type}">
                    </video>
                `;
            }
        }
    });

    mergeBtn.addEventListener("click", async () => {
        if (!audioFile || !videoFile) {
            alert("Please select both audio and video files first.");
            return;
        }

        const originalText = mergeBtn.textContent;
        mergeBtn.textContent = "Loading Engine...";
        mergeBtn.disabled = true;

        let progressTimer;

        try {
            const { ffmpeg, fetchFile } = await getFFmpeg();

            const audioExt = audioFile.name.split('.').pop() || 'mp3';
            const videoExt = videoFile.name.split('.').pop() || 'mp4';
            const inputAudioName = `input.${audioExt}`;
            const inputVideoName = `input.${videoExt}`;

            let dots = 0;
            progressTimer = setInterval(() => {
                dots = (dots + 1) % 4;
                mergeBtn.textContent = `Merging${".".repeat(dots)}`;
            }, 400);

            // Ensure input files are proper Uint8Array for ffmpeg VFS
            const audioData = audioFile instanceof Uint8Array
                ? audioFile
                : new Uint8Array(await audioFile.arrayBuffer());
            const videoData = videoFile instanceof Uint8Array
                ? videoFile
                : new Uint8Array(await videoFile.arrayBuffer());

            // Pre-clean all three VFS paths so re-merges never collide on existing files
            try { await ffmpeg.deleteFile(inputAudioName); } catch (_) {}
            try { await ffmpeg.deleteFile(inputVideoName); } catch (_) {}
            try { await ffmpeg.deleteFile("output.mp4");   } catch (_) {}

            await ffmpeg.writeFile(inputAudioName, audioData);
            await ffmpeg.writeFile(inputVideoName, videoData);

            await ffmpeg.exec([
                "-i", inputVideoName,
                "-i", inputAudioName,
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                "output.mp4"
            ]);

            clearInterval(progressTimer);

            const data = await ffmpeg.readFile("output.mp4");
            const finalBlob = new Blob([data.buffer], { type: "video/mp4" });

            if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl);
            mergedBlobUrl = URL.createObjectURL(finalBlob);

            if (previewBox) {
                previewBox.innerHTML = `
                    <video id="preview-video-element" style="width: 100%; max-height: 450px; border-radius: 8px;" controls controlslist="nodownload">
                        <source src="${mergedBlobUrl}" type="video/mp4">
                    </video>
                `;
            }

            const videoEl = document.getElementById("preview-video-element");
            if (videoEl) videoEl.play().catch(() => { });

            alert("Audio successfully synchronized with video clip!");

            try {
                await ffmpeg.deleteFile(inputAudioName);
                await ffmpeg.deleteFile(inputVideoName);
                await ffmpeg.deleteFile("output.mp4");
            } catch (cleanupErr) {
                console.warn("Cleanup error in merge VFS:", cleanupErr);
            }

        } catch (error) {
            console.error("Muxing operation exception caught:", error);
            alert("An error occurred during merging. Check F12 Console for details.");
        } finally {
            if (progressTimer) clearInterval(progressTimer);
            mergeBtn.textContent = originalText;
            mergeBtn.disabled = false;
        }
    });

    if (downloadMp4Btn) {
        downloadMp4Btn.addEventListener("click", () => {
            if (!mergedBlobUrl) {
                alert("Please process the files before downloading.");
                return;
            }
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = mergedBlobUrl;
            a.download = "scriptsync_final_output.mp4";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
}