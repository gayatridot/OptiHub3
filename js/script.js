import { initSidebarNavigation } from './shared.js';
import { initTTSPage } from './tts.js';
import { initCompressorPage } from './compressor.js';
import { initAudioVideoPage } from './merge.js';

// Attach functions to the global window object to prevent ReferenceError
window.initSidebarNavigation = initSidebarNavigation;
window.initTTSPage = initTTSPage;
window.initCompressorPage = initCompressorPage;
window.initAudioVideoPage = initAudioVideoPage;

export function initIndexPage() {
    window.initIndexPage = initIndexPage;
    document.querySelectorAll(".btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const text = btn.textContent.toLowerCase();
            if (text.includes("get started")) {
                e.preventDefault();
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            } else if (text.includes("audio") || text.includes("speech")) {
                window.location.href = "html/tts.html";
            } else if (text.includes("compress") || text.includes("optimize")) {
                window.location.href = "html/compressor.html";
            } else if (text.includes("merge") || text.includes("video") || text.includes("media")) {
                window.location.href = "html/audio-video.html";
            }
        });
    });
}

function handleRouting() {
    const path = window.location.pathname;
    const isIndex = path === "/" || path.endsWith("/index.html") || path.endsWith("/index") || path.endsWith("/");
    const isTTS = path.endsWith("/tts.html") || path.endsWith("/tts");
    const isCompressor = path.endsWith("/compressor.html") || path.endsWith("/compressor");
    const isAudioVideo = path.endsWith("/audio-video.html") || path.endsWith("/audio-video");

    if (isIndex) {
        initIndexPage();
    } else if (isTTS) {
        initTTSPage();
    } else if (isCompressor) {
        initCompressorPage();
    } else if (isAudioVideo) {
        initAudioVideoPage();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleRouting);
} else {
    handleRouting();
}
