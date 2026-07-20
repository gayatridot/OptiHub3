function initCompressorPage() {
    const uploadBox = document.querySelector(".upload-box");
    const modeButtons = document.querySelectorAll(".control-group:nth-child(1).btn-secondary");
    const compressButtons = document.querySelectorAll(".control-group:nth-child(2).btn-secondary");
    const targetSizeInput = document.getElementById("targetSizeInput");
    const compressBtn = document.getElementById("compress-btn");

    const settingsSection = document.querySelector(".tts-section");
    const featuresSection = document.querySelector(".features");
    const compressedFileCard = document.getElementById("compressedFileCard");
    const fileIcon = document.getElementById("fileIcon");
    const fileNameElement = document.getElementById("fileName");
    const fileExtElement = document.getElementById("fileExt");
    const fileSizesElement = document.getElementById("fileSizes");
    const singleDownloadBtn = document.getElementById("singleDownloadBtn");

    let selectedFile = null;
    let activeFileBlob = null;
    let activeFileName = "CompressedFile";
    let ffmpeg = null;

    // Default States
    [settingsSection, featuresSection].forEach(el => el && (el.style.display = "block"));
    if (compressedFileCard) compressedFileCard.style.display = "none";
    if (singleDownloadBtn) {
        singleDownloadBtn.disabled = true;
        singleDownloadBtn.style.opacity = "0.5";
    }

    // Unified Helpers
    const bytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

    const setSuccess = (originalSizeMB, finalSizeMB) => {
        compressedFileCard.className = "feature-card compress-success";
        fileSizesElement.textContent = `Compressed! ${originalSizeMB} MB → ${finalSizeMB} MB`;
        singleDownloadBtn.disabled = false;
        singleDownloadBtn.style.opacity = "1";
    };

    const setError = (msg) => {
        compressedFileCard.className = "feature-card compress-error";
        fileSizesElement.textContent = `Error: ${msg}`;
    };

    const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

    // Initialize FFmpeg
    async function loadFFmpeg() {
        if (ffmpeg) return ffmpeg;
        try {
            if (!window.FFmpegESM) {
                await new Promise(resolve => window.addEventListener("ffmpeg-esm-ready", resolve, { once: true }));
            }
            const { FFmpeg, toBlobURL } = window.FFmpegESM;
            ffmpeg = new FFmpeg();
            ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
            ffmpeg.on("progress", ({ progress }) => {
                const percent = Math.min(100, Math.round(progress * 100));
                if (fileSizesElement) fileSizesElement.textContent = `Compressing: ${percent}%`;
            });

            const coreBase = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
            const workerAbsoluteURL = new URL("ffmpeg-worker/worker.js", document.baseURI).href;

            await ffmpeg.load({
                coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm"),
                classWorkerURL: workerAbsoluteURL,
            });
            return ffmpeg;
        } catch (err) {
            console.error("FFmpeg failed to load, falling back to simulation.", err);
            return null;
        }
    }

    // Common FFmpeg Processor
    async function processWithFFmpeg(file, outputName, args, ext) {
        const instance = await loadFFmpeg();
        if (!instance) throw new Error("Compression engine failed to load");
        const { fetchFile } = window.FFmpegESM;
        const inputName = `input.${ext}`;

        await instance.writeFile(inputName, await fetchFile(file));
        await instance.exec(args);
        const data = await instance.readFile(outputName);
        return new Blob([data.buffer], { type: outputName.endsWith('.mp4') ? "video/mp4" : "audio/mp3" });
    }

    // Unified Iterative Media Encoder for Audio/Video
    async function compressMediaWithRetry({ file, ext, durationSec, targetNum, isVideo }) {
        const audioBitrate = 96;
        let bitrate = isVideo 
            ? Math.max(100, Math.floor((targetNum * 8192 * 0.88) / durationSec) - audioBitrate)
            : Math.max(32, Math.min(320, Math.floor((targetNum * 8192 * 0.9) / durationSec)));
        
        let attempts = 0;
        let finalBlob;
        const minBitrate = isVideo ? 100 : 32;
        const outputName = isVideo ? "output.mp4" : "output.mp3";

        while (attempts < 4) {
            fileSizesElement.textContent = `Encoding ${isVideo ? 'video' : 'audio'} at ${bitrate}kbps (attempt ${attempts + 1})...`;
            
            const args = isVideo ? [
                "-i", `input.${ext}`, "-vf", "scale=-2:480,fps=24", "-vcodec", "mpeg4",
                "-b:v", `${bitrate}k`, "-acodec", "aac", "-b:a", `${audioBitrate}k`, outputName
            ] : [
                "-i", `input.${ext}`, "-b:a", `${bitrate}k`, "-ar", "44100", "-ac", "2", outputName
            ];

            finalBlob = await processWithFFmpeg(file, outputName, args, ext);
            const resultSizeMB = finalBlob.size / (1024 * 1024);

            if (resultSizeMB <= targetNum || bitrate <= minBitrate) break;

            // Scale bitrate down proportionally
            const scaleFactor = isVideo ? 0.9 : 0.92;
            bitrate = Math.max(minBitrate, Math.floor(bitrate * (targetNum / resultSizeMB) * scaleFactor));
            attempts++;
        }
        return finalBlob;
    }

    // Image Compression
    function compressImage(file, targetSizeMB, originalSizeMB) {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width; canvas.height = img.height;
                canvas.getContext("2d").drawImage(img, 0, 0);
                const quality = targetSizeMB < originalSizeMB ? Math.max(0.1, (targetSizeMB / originalSizeMB) * 0.6) : 0.7;
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl);
                    blob ? resolve(blob) : reject(new Error("Canvas toBlob failed."));
                }, "image/jpeg", quality);
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image failed to load.")); };
            img.src = objectUrl;
        });
    }

    // PDF Compression
    async function compressPDF(file, targetSizeMB, originalSizeMB) {
        if (!window.pdfjsLib || !window.PDFLib) throw new Error("PDF libraries not loaded");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdfjsDoc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const numPages = pdfjsDoc.numPages;
        const quality = targetSizeMB < originalSizeMB ? Math.max(0.15, (targetSizeMB / originalSizeMB) * 0.5) : 0.5;
        const newPdf = await PDFLib.PDFDocument.create();

        for (let i = 1; i <= numPages; i++) {
            const percentComplete = Math.round(((i - 1) / numPages) * 100);
            if (fileSizesElement) fileSizesElement.textContent = `Compressing PDF: ${percentComplete}% (Page ${i}/${numPages})`;
            await yieldToMain();

            const page = await pdfjsDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width; canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

            const jpegBytes = await new Promise(resolve => {
                canvas.toBlob(async blob => resolve(new Uint8Array(await blob.arrayBuffer())), "image/jpeg", quality);
            });
            const jpgImage = await newPdf.embedJpg(jpegBytes);
            const newPage = newPdf.addPage([viewport.width, viewport.height]);
            newPage.drawImage(jpgImage, { x: 0, y: 0, width: viewport.width, height: viewport.height });
        }
        fileSizesElement.textContent = "Finalizing PDF...";
        return new Blob([await newPdf.save()], { type: "application/pdf" });
    }

    // File Handlers & Listeners
    const fileInput = document.createElement("input");
    fileInput.type = "file"; fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    const processSelectedFile = (file) => {
        if (!file) return;
        selectedFile = file;
        handleUploadedFile(selectedFile);
    };

    uploadBox?.addEventListener("click", () => fileInput.click());
    uploadBox?.addEventListener("dragover", e => { e.preventDefault(); uploadBox.style.borderColor = "var(--primary)"; });
    uploadBox?.addEventListener("dragleave", () => uploadBox.style.borderColor = "");
    uploadBox?.addEventListener("drop", e => {
        e.preventDefault(); uploadBox.style.borderColor = "";
        processSelectedFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", e => processSelectedFile(e.target.files[0]));

    // Toggle Buttons
    modeButtons.forEach(btn => btn.addEventListener("click", e => {
        e.stopPropagation();
        modeButtons.forEach(b => { b.style.background = ""; b.style.color = ""; });
        btn.style.background = "var(--primary)"; btn.style.color = "#fff";
    }));
    compressButtons.forEach(btn => btn.addEventListener("click", e => {
        e.stopPropagation();
        btn.style.background = btn.style.background ? "" : "var(--primary)";
        btn.style.color = btn.style.color ? "" : "#fff";
    }));

    function handleUploadedFile(file) {
        const originalSizeMB = bytesToMB(file.size);
        document.getElementById("uploadStatusIcon") && (document.getElementById("uploadStatusIcon").textContent = "✅");
        document.getElementById("uploadStatusText") && (document.getElementById("uploadStatusText").textContent = `Uploaded: ${file.name}`);
        document.getElementById("uploadStatusSize") && (document.getElementById("uploadStatusSize").textContent = `Original Size: ${originalSizeMB} MB`);
        if (compressedFileCard) compressedFileCard.style.display = "none";
        activeFileBlob = null;
    }

    function getMediaDuration(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const media = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
            media.preload = "metadata"; media.src = url;

            media.onloadedmetadata = () => {
                if (media.duration === Infinity || isNaN(media.duration)) {
                    media.currentTime = Number.MAX_SAFE_INTEGER;
                    media.ontimeupdate = () => {
                        media.ontimeupdate = null; URL.revokeObjectURL(url);
                        resolve(media.duration);
                    };
                } else {
                    URL.revokeObjectURL(url); resolve(media.duration);
                }
            };
            media.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read media duration.")); };
        });
    }

    // Main Compress Execution
    compressBtn?.addEventListener("click", async e => {
        e.preventDefault(); e.stopPropagation();
        if (!selectedFile) return alert("Please upload a file first");

        if (compressedFileCard) compressedFileCard.style.display = "flex";
        compressedFileCard.className = "feature-card compressing";

        const [coreName, ext] = [selectedFile.name.split('.').slice(0, -1).join('.'), selectedFile.name.split('.').pop()];
        fileIcon.textContent = selectedFile.type.startsWith("video/") ? "📹" : selectedFile.type.startsWith("image/") ? "🖼️" : selectedFile.type.startsWith("audio/") ? "🎵" : "📄";
        fileNameElement.textContent = coreName; fileExtElement.textContent = ext;

        const originalSizeMB = bytesToMB(selectedFile.size);
        const targetNum = parseFloat(targetSizeInput?.value) || 10;

        try {
            if (selectedFile.type.startsWith("video/") || selectedFile.type.startsWith("audio/")) {
                fileSizesElement.textContent = "Analyzing media duration...";
                const durationSec = await getMediaDuration(selectedFile);
                const isVideo = selectedFile.type.startsWith("video/");

                activeFileBlob = await compressMediaWithRetry({
                    file: selectedFile, ext, durationSec, targetNum, isVideo
                });
                activeFileName = `${coreName}.${isVideo ? 'mp4' : 'mp3'}`;
            }
            else if (selectedFile.type.startsWith("image/")) {
                fileSizesElement.textContent = "Optimizing image...";
                activeFileBlob = await compressImage(selectedFile, targetNum, parseFloat(originalSizeMB));
                activeFileName = selectedFile.name;
            }
            else if (selectedFile.type === "application/pdf" || ext.toLowerCase() === "pdf") {
                activeFileBlob = await compressPDF(selectedFile, targetNum, parseFloat(originalSizeMB));
                activeFileName = `${coreName}.pdf`;
            }
            else {
                fileSizesElement.textContent = "File type not supported for real compression. Copying file.";
                activeFileBlob = new Blob([selectedFile], { type: selectedFile.type });
                activeFileName = selectedFile.name;
            }

            setSuccess(originalSizeMB, bytesToMB(activeFileBlob.size));

        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    });

    // Download Handler
    singleDownloadBtn?.addEventListener("click", e => {
        e.stopPropagation();
        if (!activeFileBlob) return;
        const url = URL.createObjectURL(activeFileBlob);
        const a = document.createElement("a");
        a.href = url; a.download = `compressed_${activeFileName}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}