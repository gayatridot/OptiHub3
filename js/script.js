function initIndexPage() {
    document.querySelectorAll(".btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const text = btn.textContent.toLowerCase();
            if (text.includes("get started")) {
                e.preventDefault();
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
            } else if (text.includes("audio") || text.includes("speech")) {
                window.location.href = "tts.html";
            } else if (text.includes("compress") || text.includes("optimize")) {
                window.location.href = "compressor.html";
            } else if (text.includes("merge") || text.includes("video") || text.includes("media")) {
                window.location.href = "audio-video.html";
            }
        });
    });
}



document.addEventListener("DOMContentLoaded", () => {
    const page = window.location.pathname.split("/").pop() || "index.html";

    switch (page) {
        case "index.html":
            initIndexPage();
            break;
        case "tts.html":
            initTTSPage();
            break;
        case "compressor.html":
            initCompressorPage();
            break;
        case "audio-video.html":
            initAudioVideoPage();
            break;
    }
});
