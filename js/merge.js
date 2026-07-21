console.log("MERGE.JS VERSION: fixed-corepath-v2");

export async function initAudioVideoPage() {
    const changeAudioBtn = document.getElementById("change-audio-btn");
    const changeVideoBtn = document.getElementById("change-video-btn");
    const mergeBtn = document.getElementById("merge-preview-btn");
    const downloadMp4Btn = document.getElementById("download-mp4-btn");
    const previewBox = document.getElementById("preview-box");

    const audioInput = document.createElement("input");
    audioInput.type = "file";
    audioInput.accept = "audio/*";

    const videoInput = document.createElement("input");
    videoInput.type = "file";
    videoInput.accept = "video/*";

    let audioFile = null;
    let videoFile = null;
    let mergedBlobUrl = null;

    const FFMPEG_CDN = "https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js";
    const FFMPEG_CORE_PATH = "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js";

    const loadScript = (url) => new Promise((resolve, reject) => {
        if (typeof window.FFmpeg !== "undefined") return resolve();
        const script = document.createElement("script");
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    changeAudioBtn.addEventListener("click", () => audioInput.click());
    audioInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            audioFile = e.target.files[0];
            document.getElementById("audio-file-info").textContent = `♪ ${audioFile.name}`;
        }
    });

    changeVideoBtn.addEventListener("click", () => videoInput.click());
    videoInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
            videoFile = e.target.files[0];
            document.getElementById("video-file-info").textContent = `📄 ${videoFile.name}`;

            previewBox.innerHTML = `
                <video id="preview-video-element" style="width: 100%; max-height: 450px; border-radius: 8px;" controls>
                    <source src="${URL.createObjectURL(videoFile)}" type="${videoFile.type}">
                </video>
            `;
        }
    });

    mergeBtn.addEventListener("click", async () => {
        if (!audioFile || !videoFile) {
            alert("Please select both audio and video files first.");
            return;
        }

        const originalText = mergeBtn.textContent;
        mergeBtn.textContent = "Merging tracks...";
        mergeBtn.disabled = true;

        let progressTimer;

        try {
            await loadScript(FFMPEG_CDN);

            const { createFFmpeg, fetchFile } = window.FFmpeg;
            const ffmpeg = createFFmpeg({
                log: true,
                corePath: FFMPEG_CORE_PATH
            });

            await ffmpeg.load();

            const audioExt = audioFile.name.split('.').pop() || 'mp3';
            const videoExt = videoFile.name.split('.').pop() || 'mp4';
            const inputAudioName = `input.${audioExt}`;
            const inputVideoName = `input.${videoExt}`;

            let dots = 0;
            progressTimer = setInterval(() => {
                dots = (dots + 1) % 4;
                mergeBtn.textContent = `Merging${".".repeat(dots)}`;
            }, 400);

            ffmpeg.FS("writeFile", inputAudioName, await fetchFile(audioFile));
            ffmpeg.FS("writeFile", inputVideoName, await fetchFile(videoFile));

            await ffmpeg.run(
                "-i", inputVideoName,
                "-i", inputAudioName,
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                "output.mp4"
            );

            clearInterval(progressTimer);

            const data = ffmpeg.FS("readFile", "output.mp4");
            const finalBlob = new Blob([data.buffer], { type: "video/mp4" });

            if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl);
            mergedBlobUrl = URL.createObjectURL(finalBlob);

            previewBox.innerHTML = `
                <video id="preview-video-element" style="width: 100%; max-height: 450px; border-radius: 8px;" controls controlslist="nodownload">
                    <source src="${mergedBlobUrl}" type="video/mp4">
                </video>
            `;

            const videoEl = document.getElementById("preview-video-element");
            if (videoEl) videoEl.play().catch(() => {});

            alert("Audio successfully synchronized with video clip completely free!");

            ffmpeg.FS("unlink", inputAudioName);
            ffmpeg.FS("unlink", inputVideoName);
            ffmpeg.FS("unlink", "output.mp4");

        } catch (error) {
            if (progressTimer) clearInterval(progressTimer);
            console.error("Muxing operation exception caught:", error);
            alert("An error occurred during merging. Please make sure the uploaded files are valid.");
        } finally {
            mergeBtn.textContent = originalText;
            mergeBtn.disabled = false;
        }
    });

    downloadMp4Btn.addEventListener("click", () => {
        if (!mergedBlobUrl) {
            alert("Please click 'Merge & Preview' to process the files before downloading.");
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