import fs from 'fs';

async function runBuild() {
  console.log('🧹 Cleaning dist directory...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('✅ Deleted dist/ directory.');
  }

  const faviconPath = 'favicon.ico';
  if (!fs.existsSync(faviconPath)) {
    console.log('📦 Creating dummy favicon.ico...');
    // Create an empty favicon.ico file to prevent browser 404s
    fs.writeFileSync(faviconPath, '');
    console.log('✅ Created favicon.ico');
  } else {
    console.log('✅ favicon.ico already exists.');
  }
}

runBuild();
