import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';

const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

async function runBuild() {
  console.log('🧹 Cleaning dist directory...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });

  console.log('📦 Copying static assets...');
  const filesToCopy = [
    'index.html',
    'tts.html',
    'compressor.html',
    'audio-video.html',
    'about.html',
    'style.css',
    'robots.txt',
    'piper_phonemize.js',
    'tts-worker.js'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  -> Copying ${file}`);
      fs.copyFileSync(file, path.join('dist', file));
    } else {
      console.warn(`  ⚠️ File not found: ${file}`);
    }
  });

  if (fs.existsSync('ffmpeg-worker')) {
    console.log('  -> Copying ffmpeg-worker directory');
    copyRecursiveSync('ffmpeg-worker', 'dist/ffmpeg-worker');
  } else {
    console.warn('  ⚠️ ffmpeg-worker directory not found');
  }

  console.log('🚀 Bundling client-side javascript with esbuild...');
  try {
    await esbuild.build({
      entryPoints: ['js/script.js'],
      bundle: true,
      minify: true,
      sourcemap: true,
      outfile: 'dist/js/bundle.js',
      format: 'esm',
      target: ['es2020'],
      logLevel: 'info',
    });
    console.log('✨ Build completed successfully! Output in dist/');
  } catch (error) {
    console.error('❌ Build failed during esbuild compilation:', error);
    process.exit(1);
  }
}

runBuild();
