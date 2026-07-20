# 🖼️🎵 OptiHub3 🎤🎥

**Audio & Video Processing Hub — Beta Version**

OptiHub3 is a modular web-based toolkit for audio/video compression, merging, and text-to-speech (TTS). Built with JavaScript and FFmpeg workers, it provides lightweight browser-side processing for media optimization.

---

## 📸 Project Preview

<img width="1908" height="894" alt="image" src="https://github.com/user-attachments/assets/c5bd3a4a-21bd-49d2-8cf5-2cb116f511f7" />

---

## 📂 Project Structure

```
OptiHub3/
│
├── api/                     # API integration layer
│
├── ffmpeg-worker/           # FFmpeg worker scripts
│   ├── const.js
│   ├── errors.js
│   └── worker.js
│
├── js/                      # Core JavaScript modules
│   ├── compressor.js        # Audio/video compression logic
│   ├── merge.js             # File merging utilities
│   ├── script.js            # Main app script
│   ├── shared.js            # Shared helper functions
│   └── tts.js               # Text-to-speech functionality
│
├── index.html               # Landing page
├── audio-video.html         # Audio → Video conversion page
├── compressor.html          # Compression UI
├── tts.html                 # Text-to-speech UI
│
├── style.css                # Global styles
├── server.js                # Node.js server entry
├── package.json             # Dependencies & scripts
├── robots.txt               # Crawler rules
├── .gitignore               # Git ignore rules
└── README.md                # Documentation
```

---

## ⚙️ Features

- 🎤 **Mic Recording** — Capture and process audio input.  
- 🎥 **Video Handling** — Convert audio to video and merge streams.  
- 🗜️ **Compression** — Optimize media files with FFmpeg worker.  
- 🗣️ **Text-to-Speech (TTS)** — Generate speech from text.  
- 🔧 **Modular Design** — Separate JS modules for clarity and maintainability.  

---

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/OptiHub3.git
   ```
2. Navigate into the project folder:
   ```bash
   cd OptiHub3
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
5. Open `http://127.0.0.1/index.html` in your browser.

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure  
- **CSS3** — Responsive styling  
- **JavaScript (ES6)** — Core logic  
- **FFmpeg Worker** — Media compression and merging  
- **Node.js** — Backend server  

---

## 📌 Status

This project is in **Beta Version**. Expect frequent updates and improvements.

---

## 📜 License
Released under the MIT License © 2026 Created By Gayatri Ghogare


