// 1. Centralized Templates
const isSubfolder = window.location.pathname.includes('/html/') || 
                    window.location.pathname === '/tts' ||
                    window.location.pathname === '/audio-video' ||
                    window.location.pathname === '/compressor' ||
                    window.location.pathname === '/about';
const homeLink = isSubfolder ? '../index.html' : 'index.html';
const ttsLink = isSubfolder ? 'tts.html' : 'html/tts.html';
const avLink = isSubfolder ? 'audio-video.html' : 'html/audio-video.html';
const compLink = isSubfolder ? 'compressor.html' : 'html/compressor.html';
const aboutLink = isSubfolder ? 'about.html' : 'html/about.html';

const navbar = `
<header class="navbar">
  <div class="container">
    <div class="logo">
      <svg class="logo-icon" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm5 10a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM9 21h6v-2H9v2z" />
      </svg>
      <h1>Opti<span>Hub3</span></h1>
    </div>
    <nav class="nav-links">
      <a href="${homeLink}">Home</a>
      <a href="${ttsLink}">TTS</a>
      <a href="${avLink}">Merge Audio-Video</a>
      <a href="${compLink}">Compress Files</a>
      <a href="${aboutLink}">About</a>
    </nav>
    <button id="menu-btn">☰</button>
  </div>
</header>

<div id="dropdown" class="dropdown">
      <a href="${homeLink}">Home</a>
      <a href="${ttsLink}">TTS</a>
      <a href="${avLink}">Merge Audio-Video</a>
      <a href="${compLink}">Compress Files</a>
      <a href="${aboutLink}">About</a>
</div>
<div id="overlay"></div>
`;

const footer = `
<footer class="site-footer">
  <h4>🎤OptiHub3-Beta</h4>
  <p>All rights reserved ©2026</p>
</footer>
`;

export function initSidebarNavigation() {
  const menuBtn = document.getElementById("menu-btn");
  const dropdown = document.getElementById("dropdown");
  const overlay = document.getElementById("overlay");

  if (menuBtn && dropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === "flex";
      dropdown.style.display = isOpen ? "none" : "flex";
      if (overlay) overlay.style.display = isOpen ? "none" : "block";
    });

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener("click", () => {
        dropdown.style.display = "none";
        overlay.style.display = "none";
      })
    }

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== menuBtn) {
        dropdown.style.display = "none";
        if (overlay) overlay.style.display = "none";
      }
    });
  }
}

function initHeaderFooter() {
  const headerContainer = document.getElementById('app-header');
  const footerContainer = document.getElementById('app-footer');

  if (headerContainer) headerContainer.innerHTML = navbar;
  if (footerContainer) footerContainer.innerHTML = footer;

  initSidebarNavigation();

  document.querySelectorAll("details").forEach((detail) => {
    detail.addEventListener("toggle", () => {
      detail.style.backgroundColor = detail.open ? "#fff7ed" : "#fff";
    });
  });

  const btnOpti = document.getElementById("btn-opti");
  if (btnOpti) {
    btnOpti.addEventListener("click", () => {
      window.location.href = homeLink;
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeaderFooter);
} else {
  initHeaderFooter();
}